using Microsoft.AspNetCore.Mvc;
using Prixo.Api.Authorization;
using Prixo.Application.Common.Models;
using Prixo.Application.Common.Security;
using Prixo.Application.Features.Analytics;

namespace Prixo.Api.Controllers.Analytics;

[Route("api/v1/customer-analytics")]
[HasPermission(PermissionRegistry.DashboardHomeView)]
public class CustomerAnalyticsController(RazorpayAnalyticsService analyticsService) : ApiControllerBase
{
    /// <summary>
    /// Returns product-wise and customer-wise repetition & duplication analytics.
    /// </summary>
    [HttpGet("summary")]
    public async Task<ActionResult<ApiResponse<CustomerAnalyticsSummaryDto>>> GetSummary(CancellationToken ct)
    {
        var summary = await analyticsService.GetAnalyticsSummaryAsync(ct);
        return OkResponse(summary);
    }

    /// <summary>
    /// Fetches live payments directly from Razorpay API, updates local cache, and returns refreshed summary.
    /// </summary>
    [HttpPost("sync")]
    public async Task<ActionResult<ApiResponse<CustomerAnalyticsSummaryDto>>> SyncFromRazorpay(CancellationToken ct)
    {
        await analyticsService.SyncFromRazorpayAsync(ct);
        var summary = await analyticsService.GetAnalyticsSummaryAsync(ct);
        return OkResponse(summary, "Synced successfully from Razorpay API.");
    }
}
