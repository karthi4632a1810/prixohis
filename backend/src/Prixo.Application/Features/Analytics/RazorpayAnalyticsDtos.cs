namespace Prixo.Application.Features.Analytics;

public record RazorpayRawPayment
{
    public string Id { get; init; } = "";
    public string? OrderId { get; init; }
    public long Amount { get; init; } // in paise
    public string? Status { get; init; }
    public string? Method { get; init; }
    public string? Description { get; init; }
    public string? Email { get; init; }
    public string? Contact { get; init; }
    public long CreatedAt { get; init; } // unix seconds
    public Dictionary<string, string>? Notes { get; init; }
}

public record CustomerOrderStepDto
{
    public int StepNumber { get; init; }
    public string PaymentId { get; init; } = "";
    public DateTimeOffset Date { get; init; }
    public decimal Amount { get; init; }
    public string Product { get; init; } = "";
    public int DaysSincePrevious { get; init; }
}

public record ExitProductAnalyticsDto
{
    public string ProductName { get; init; } = "";
    public int DroppedOffCustomers { get; init; }
    public decimal LostRevenueAtRisk { get; init; }
    public double ShareOfDropOffPercent { get; init; }
}

public record CustomerAnalyticsItemDto
{
    public string CustomerKey { get; init; } = "";
    public string Name { get; init; } = "";
    public string Phone { get; init; } = "";
    public string Email { get; init; } = "";
    public string City { get; init; } = "";
    public string State { get; init; } = "";
    public string Pincode { get; init; } = "";
    public int OrdersCount { get; init; } // Duplication count
    public decimal TotalSpend { get; init; } // in INR
    public DateTimeOffset FirstOrderAt { get; init; }
    public DateTimeOffset LastOrderAt { get; init; }
    public string Classification { get; init; } = ""; // "Regular Buyer", "Repeat Buyer", "First Time"
    public List<string> ProductsBought { get; init; } = [];
    public int AverageIntervalDays { get; init; }
    public int DaysSinceLastOrder { get; init; }
    public string JourneyStage { get; init; } = ""; // "Active & Healthy", "Growing Cadence", "Slowing Down", "At Risk (Overdue)", "Dropped Off (Churned)", "One-Time Lapsed", "One-Time Recent"
    public string TrendDescription { get; init; } = "";
    public string LastProductBought { get; init; } = "";
    public List<CustomerOrderStepDto> OrderHistory { get; init; } = [];
}

public record ProductAnalyticsItemDto
{
    public string ProductName { get; init; } = "";
    public int OrdersCount { get; init; }
    public decimal Revenue { get; init; }
    public int UniqueCustomers { get; init; }
    public int RepeatCustomers { get; init; }
    public double RepeatCustomerRatePercent { get; init; }
}

public record RazorpayRecentOrderDto
{
    public string PaymentId { get; init; } = "";
    public string OrderId { get; init; } = "";
    public decimal Amount { get; init; }
    public string Status { get; init; } = "";
    public string Method { get; init; } = "";
    public string CustomerName { get; init; } = "";
    public string Phone { get; init; } = "";
    public string Email { get; init; } = "";
    public string City { get; init; } = "";
    public string Products { get; init; } = "";
    public DateTimeOffset CreatedAt { get; init; }
}

public record CustomerAnalyticsSummaryDto
{
    public decimal TotalRevenue { get; init; }
    public int TotalOrders { get; init; }
    public int UniqueCustomers { get; init; }
    public int SingleOrderCustomers { get; init; }
    public int RepeatBuyersCount { get; init; } // 2-3 orders
    public int RegularBuyersCount { get; init; } // 4+ orders
    public int TotalRepeatCustomers { get; init; } // Repeat + Regular
    public double DuplicationRatePercent { get; init; }
    public decimal AverageOrderValue { get; init; }
    public double AverageOrdersPerCustomer { get; init; }
    public DateTimeOffset? LastSyncedAt { get; init; }
    public int DroppedOffCustomersCount { get; init; }
    public int AtRiskCustomersCount { get; init; }
    public int SlowingDownCustomersCount { get; init; }
    public int GrowingCustomersCount { get; init; }
    public int ActiveCustomersCount { get; init; }
    public decimal ChurnedRevenueAtRisk { get; init; }
    public double AverageRepeatIntervalDays { get; init; }
    public List<ExitProductAnalyticsDto> TopExitProducts { get; init; } = [];
    public List<CustomerAnalyticsItemDto> Customers { get; init; } = [];
    public List<ProductAnalyticsItemDto> Products { get; init; } = [];
    public List<RazorpayRecentOrderDto> RecentOrders { get; init; } = [];
}
