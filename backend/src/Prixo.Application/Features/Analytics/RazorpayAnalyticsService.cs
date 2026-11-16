using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace Prixo.Application.Features.Analytics;

public class RazorpayAnalyticsService
{
    private readonly HttpClient _http;
    private readonly IConfiguration _config;
    private readonly ILogger<RazorpayAnalyticsService> _logger;
    private readonly string _cacheFilePath;
    private static readonly SemaphoreSlim _syncLock = new(1, 1);

    private const string DefaultKeyId = "rzp_live_RxNRBCo2yYi6cL";
    private const string DefaultKeySecret = "hhraTAJVoa0LTLNhDspWtQXz";

    public RazorpayAnalyticsService(HttpClient http, IConfiguration config, ILogger<RazorpayAnalyticsService> logger)
    {
        _http = http;
        _config = config;
        _logger = logger;

        var baseDir = AppContext.BaseDirectory;
        var appData = Path.Combine(baseDir, "App_Data");
        if (!Directory.Exists(appData))
        {
            Directory.CreateDirectory(appData);
        }
        _cacheFilePath = Path.Combine(appData, "razorpay_payments_cache.json");
    }

    private (string KeyId, string KeySecret) GetCredentials()
    {
        var keyId = _config["Razorpay:KeyId"];
        var keySecret = _config["Razorpay:KeySecret"];
        if (string.IsNullOrWhiteSpace(keyId)) keyId = DefaultKeyId;
        if (string.IsNullOrWhiteSpace(keySecret)) keySecret = DefaultKeySecret;
        return (keyId, keySecret);
    }

    public async Task<int> SyncFromRazorpayAsync(CancellationToken ct = default)
    {
        await _syncLock.WaitAsync(ct);
        try
        {
            var (keyId, keySecret) = GetCredentials();
            var authHeader = Convert.ToBase64String(Encoding.ASCII.GetBytes($"{keyId}:{keySecret}"));

            var existing = await LoadCachedPaymentsAsync();
            var paymentMap = existing.ToDictionary(p => p.Id, p => p);

            int skip = 0;
            const int count = 100;
            int newCount = 0;

            while (!ct.IsCancellationRequested)
            {
                var request = new HttpRequestMessage(HttpMethod.Get, $"https://api.razorpay.com/v1/payments?count={count}&skip={skip}");
                request.Headers.Authorization = new AuthenticationHeaderValue("Basic", authHeader);

                var response = await _http.SendAsync(request, ct);
                if (!response.IsSuccessStatusCode)
                {
                    _logger.LogWarning("Razorpay API returned {Status}", response.StatusCode);
                    break;
                }

                var jsonStr = await response.Content.ReadAsStringAsync(ct);
                using var doc = JsonDocument.Parse(jsonStr);

                if (!doc.RootElement.TryGetProperty("items", out var itemsElement) || itemsElement.GetArrayLength() == 0)
                {
                    break;
                }

                int batchSize = 0;
                foreach (var elem in itemsElement.EnumerateArray())
                {
                    batchSize++;
                    var id = elem.GetProperty("id").GetString() ?? "";
                    if (string.IsNullOrEmpty(id)) continue;

                    var orderId = elem.TryGetProperty("order_id", out var oProp) ? oProp.GetString() : null;
                    var amount = elem.TryGetProperty("amount", out var aProp) ? aProp.GetInt64() : 0;
                    var status = elem.TryGetProperty("status", out var sProp) ? sProp.GetString() : "";
                    var method = elem.TryGetProperty("method", out var mProp) ? mProp.GetString() : "";
                    var desc = elem.TryGetProperty("description", out var dProp) ? dProp.GetString() : "";
                    var email = elem.TryGetProperty("email", out var eProp) ? eProp.GetString() : "";
                    var contact = elem.TryGetProperty("contact", out var cProp) ? cProp.GetString() : "";
                    var createdAt = elem.TryGetProperty("created_at", out var crProp) ? crProp.GetInt64() : 0;

                    Dictionary<string, string>? notes = null;
                    if (elem.TryGetProperty("notes", out var nProp) && nProp.ValueKind == JsonValueKind.Object)
                    {
                        notes = new Dictionary<string, string>();
                        foreach (var prop in nProp.EnumerateObject())
                        {
                            notes[prop.Name] = prop.Value.GetString() ?? "";
                        }
                    }

                    var raw = new RazorpayRawPayment
                    {
                        Id = id,
                        OrderId = orderId,
                        Amount = amount,
                        Status = status,
                        Method = method,
                        Description = desc,
                        Email = email,
                        Contact = contact,
                        CreatedAt = createdAt,
                        Notes = notes,
                    };

                    if (!paymentMap.ContainsKey(id))
                    {
                        newCount++;
                    }
                    paymentMap[id] = raw;
                }

                skip += batchSize;
                if (batchSize < count)
                {
                    break; // Reached the end
                }
            }

            var updatedList = paymentMap.Values.ToList();
            await SaveCachedPaymentsAsync(updatedList);
            return updatedList.Count;
        }
        finally
        {
            _syncLock.Release();
        }
    }

    private async Task<List<RazorpayRawPayment>> LoadCachedPaymentsAsync()
    {
        string? targetPath = null;
        if (File.Exists(_cacheFilePath))
        {
            targetPath = _cacheFilePath;
        }
        else
        {
            var seedPath = Path.Combine(AppContext.BaseDirectory, "razorpay_seed.json");
            if (File.Exists(seedPath)) targetPath = seedPath;
        }

        if (string.IsNullOrEmpty(targetPath))
        {
            return [];
        }

        try
        {
            var json = await File.ReadAllTextAsync(targetPath);
            var items = JsonSerializer.Deserialize<List<RazorpayRawPayment>>(json, new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true
            });

            if (targetPath != _cacheFilePath && items != null && items.Count > 0)
            {
                await SaveCachedPaymentsAsync(items);
            }

            return items ?? [];
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to read cached Razorpay payments from {Path}", targetPath);
            return [];
        }
    }

    private async Task SaveCachedPaymentsAsync(List<RazorpayRawPayment> payments)
    {
        try
        {
            var json = JsonSerializer.Serialize(payments, new JsonSerializerOptions { WriteIndented = true });
            await File.WriteAllTextAsync(_cacheFilePath, json);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to save cached Razorpay payments to {Path}", _cacheFilePath);
        }
    }

    public async Task<CustomerAnalyticsSummaryDto> GetAnalyticsSummaryAsync(CancellationToken ct = default)
    {
        var rawPayments = await LoadCachedPaymentsAsync();

        if (rawPayments.Count == 0)
        {
            // Auto sync if cache is empty
            await SyncFromRazorpayAsync(ct);
            rawPayments = await LoadCachedPaymentsAsync();
        }

        var captured = rawPayments.Where(p => string.Equals(p.Status, "captured", StringComparison.OrdinalIgnoreCase)).ToList();

        decimal totalRevenue = captured.Sum(p => p.Amount) / 100m;
        int totalOrders = captured.Count;

        // Group by Customer Key (normalized phone or email)
        var customerGroups = new Dictionary<string, CustomerAggregator>();
        var productGroups = new Dictionary<string, ProductAggregator>();
        var recentOrders = new List<RazorpayRecentOrderDto>();

        foreach (var p in captured)
        {
            decimal amt = p.Amount / 100m;
            string phone = (p.Contact ?? "").Trim();
            string email = (p.Email ?? "").Trim().ToLowerInvariant();
            var notes = p.Notes ?? [];

            string digitsOnly = Regex.Replace(phone, @"[^\d]", "");
            string phone10 = digitsOnly.Length >= 10 ? digitsOnly[^10..] : digitsOnly;

            string customerKey = !string.IsNullOrEmpty(phone10) ? phone10 : (!string.IsNullOrEmpty(email) ? email : p.Id);

            string city = notes.TryGetValue("city", out var c) ? c : "";
            string state = notes.TryGetValue("state", out var s) ? s : "";
            string pincode = notes.TryGetValue("pincode", out var pc) ? pc : "";
            string name = notes.TryGetValue("name", out var nm) ? nm : (notes.TryGetValue("customer_name", out var cnm) ? cnm : "");

            string productText = notes.TryGetValue("items", out var itm) && !string.IsNullOrWhiteSpace(itm)
                ? itm
                : (!string.IsNullOrWhiteSpace(p.Description) ? p.Description : "Product Order");

            var orderTime = DateTimeOffset.FromUnixTimeSeconds(p.CreatedAt);

            // Update customer record
            if (!customerGroups.TryGetValue(customerKey, out var custAgg))
            {
                custAgg = new CustomerAggregator
                {
                    Key = customerKey,
                    FirstOrder = orderTime,
                    LastOrder = orderTime,
                };
                customerGroups[customerKey] = custAgg;
            }

            custAgg.OrdersCount++;
            custAgg.TotalSpend += amt;
            if (!string.IsNullOrEmpty(phone)) custAgg.Phones.Add(phone);
            if (!string.IsNullOrEmpty(email)) custAgg.Emails.Add(email);
            if (!string.IsNullOrEmpty(name)) custAgg.Names.Add(name);
            if (!string.IsNullOrEmpty(city)) custAgg.Cities.Add(city);
            if (!string.IsNullOrEmpty(state)) custAgg.States.Add(state);
            if (!string.IsNullOrEmpty(pincode)) custAgg.Pincodes.Add(pincode);
            custAgg.Products.Add(productText);

            if (orderTime < custAgg.FirstOrder) custAgg.FirstOrder = orderTime;
            if (orderTime > custAgg.LastOrder) custAgg.LastOrder = orderTime;

            // Update product group
            if (!productGroups.TryGetValue(productText, out var prodAgg))
            {
                prodAgg = new ProductAggregator { ProductName = productText };
                productGroups[productText] = prodAgg;
            }
            prodAgg.OrdersCount++;
            prodAgg.Revenue += amt;
            prodAgg.CustomerKeys.Add(customerKey);

            // Recent orders
            recentOrders.Add(new RazorpayRecentOrderDto
            {
                PaymentId = p.Id,
                OrderId = p.OrderId ?? p.Id,
                Amount = amt,
                Status = p.Status ?? "captured",
                Method = p.Method ?? "online",
                CustomerName = string.IsNullOrEmpty(name) ? (custAgg.Names.FirstOrDefault() ?? "Customer") : name,
                Phone = phone,
                Email = email,
                City = city,
                Products = productText,
                CreatedAt = orderTime,
            });
        }

        // Build Customer List
        var customerDtos = new List<CustomerAnalyticsItemDto>();
        int singleCount = 0;
        int repeatCount = 0;
        int regularCount = 0;

        foreach (var c in customerGroups.Values)
        {
            string classification = c.OrdersCount switch
            {
                >= 4 => "Regular Buyer",
                >= 2 => "Repeat Buyer",
                _ => "First Time",
            };

            if (c.OrdersCount >= 4) regularCount++;
            else if (c.OrdersCount >= 2) repeatCount++;
            else singleCount++;

            customerDtos.Add(new CustomerAnalyticsItemDto
            {
                CustomerKey = c.Key,
                Name = c.Names.FirstOrDefault() ?? "Customer",
                Phone = c.Phones.FirstOrDefault() ?? c.Key,
                Email = c.Emails.FirstOrDefault() ?? "",
                City = c.Cities.FirstOrDefault() ?? "",
                State = c.States.FirstOrDefault() ?? "",
                Pincode = c.Pincodes.FirstOrDefault() ?? "",
                OrdersCount = c.OrdersCount,
                TotalSpend = c.TotalSpend,
                FirstOrderAt = c.FirstOrder,
                LastOrderAt = c.LastOrder,
                Classification = classification,
                ProductsBought = c.Products.Distinct().ToList(),
            });
        }

        // Sort customers: highest orders first, then highest spend
        customerDtos.Sort((a, b) =>
        {
            int cmp = b.OrdersCount.CompareTo(a.OrdersCount);
            return cmp != 0 ? cmp : b.TotalSpend.CompareTo(a.TotalSpend);
        });

        // Build Product List
        var productDtos = new List<ProductAnalyticsItemDto>();
        foreach (var prod in productGroups.Values)
        {
            int uniqueBuyers = prod.CustomerKeys.Count;
            int repeatBuyers = prod.CustomerKeys.Count(k => customerGroups.TryGetValue(k, out var cg) && cg.OrdersCount > 1);
            double repeatRate = uniqueBuyers > 0 ? Math.Round((double)repeatBuyers / uniqueBuyers * 100, 1) : 0;

            productDtos.Add(new ProductAnalyticsItemDto
            {
                ProductName = prod.ProductName,
                OrdersCount = prod.OrdersCount,
                Revenue = prod.Revenue,
                UniqueCustomers = uniqueBuyers,
                RepeatCustomers = repeatBuyers,
                RepeatCustomerRatePercent = repeatRate,
            });
        }
        productDtos.Sort((a, b) => b.Revenue.CompareTo(a.Revenue));

        int totalUnique = customerGroups.Count;
        int totalRepeat = repeatCount + regularCount;
        double duplicationRate = totalUnique > 0 ? Math.Round((double)totalRepeat / totalUnique * 100, 1) : 0;
        decimal aov = totalOrders > 0 ? Math.Round(totalRevenue / totalOrders, 2) : 0;
        double avgOrders = totalUnique > 0 ? Math.Round((double)totalOrders / totalUnique, 2) : 0;

        DateTimeOffset? lastSyncTime = File.Exists(_cacheFilePath)
            ? new DateTimeOffset(File.GetLastWriteTimeUtc(_cacheFilePath))
            : null;

        return new CustomerAnalyticsSummaryDto
        {
            TotalRevenue = totalRevenue,
            TotalOrders = totalOrders,
            UniqueCustomers = totalUnique,
            SingleOrderCustomers = singleCount,
            RepeatBuyersCount = repeatCount,
            RegularBuyersCount = regularCount,
            TotalRepeatCustomers = totalRepeat,
            DuplicationRatePercent = duplicationRate,
            AverageOrderValue = aov,
            AverageOrdersPerCustomer = avgOrders,
            LastSyncedAt = lastSyncTime,
            Customers = customerDtos,
            Products = productDtos,
            RecentOrders = recentOrders.OrderByDescending(o => o.CreatedAt).Take(200).ToList(),
        };
    }

    private class CustomerAggregator
    {
        public string Key { get; init; } = "";
        public int OrdersCount { get; set; }
        public decimal TotalSpend { get; set; }
        public DateTimeOffset FirstOrder { get; set; }
        public DateTimeOffset LastOrder { get; set; }
        public HashSet<string> Phones { get; } = new(StringComparer.OrdinalIgnoreCase);
        public HashSet<string> Emails { get; } = new(StringComparer.OrdinalIgnoreCase);
        public HashSet<string> Names { get; } = new(StringComparer.OrdinalIgnoreCase);
        public HashSet<string> Cities { get; } = new(StringComparer.OrdinalIgnoreCase);
        public HashSet<string> States { get; } = new(StringComparer.OrdinalIgnoreCase);
        public HashSet<string> Pincodes { get; } = new(StringComparer.OrdinalIgnoreCase);
        public List<string> Products { get; } = [];
    }

    private class ProductAggregator
    {
        public string ProductName { get; init; } = "";
        public int OrdersCount { get; set; }
        public decimal Revenue { get; set; }
        public HashSet<string> CustomerKeys { get; } = new(StringComparer.OrdinalIgnoreCase);
    }
}
