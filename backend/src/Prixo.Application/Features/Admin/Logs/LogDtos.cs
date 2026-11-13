using Prixo.Application.Common.Models;

namespace Prixo.Application.Features.Admin.Logs;

public record AuditLogDto(
    long Id,
    long UserId,
    string? Username,
    long? BranchId,
    string EntityName,
    string EntityId,
    string Action,
    string? OldValues,
    string? NewValues,
    string? TraceId,
    string? IpAddress,
    DateTimeOffset CreatedAt);

public class AuditLogQuery : PagedQuery
{
    public long? UserId { get; set; }
    public string? EntityName { get; set; }
    public string? Action { get; set; }
    public DateTimeOffset? From { get; set; }
    public DateTimeOffset? To { get; set; }
}

public record ActivityLogDto(
    long Id,
    long? UserId,
    string? Username,
    long? BranchId,
    string EventType,
    string Description,
    string? IpAddress,
    string? UserAgent,
    DateTimeOffset CreatedAt);

public class ActivityLogQuery : PagedQuery
{
    public long? UserId { get; set; }
    public string? EventType { get; set; }
    public DateTimeOffset? From { get; set; }
    public DateTimeOffset? To { get; set; }
}

