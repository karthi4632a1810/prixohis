using Microsoft.EntityFrameworkCore;
using Prixo.Application.Common.Interfaces;
using Prixo.Application.Common.Models;

namespace Prixo.Application.Features.Admin.Logs;

public class LogQueryService(IAppDbContext db)
{
    public async Task<PagedResult<AuditLogDto>> GetAuditLogsAsync(AuditLogQuery query, CancellationToken ct = default)
    {
        var q = db.AuditLogs.AsNoTracking();

        if (query.UserId.HasValue)
            q = q.Where(x => x.UserId == query.UserId.Value);

        if (!string.IsNullOrWhiteSpace(query.EntityName))
            q = q.Where(x => x.EntityName == query.EntityName);

        if (!string.IsNullOrWhiteSpace(query.Action))
            q = q.Where(x => x.Action == query.Action);

        if (query.From.HasValue)
            q = q.Where(x => x.CreatedAt >= query.From.Value);

        if (query.To.HasValue)
            q = q.Where(x => x.CreatedAt <= query.To.Value);

        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var term = $"%{query.Search.Trim()}%";
            q = q.Where(x => EF.Functions.ILike(x.EntityName, term) || EF.Functions.ILike(x.EntityId, term));
        }

        var total = await q.CountAsync(ct);

        var items = await (
            from a in q.OrderByDescending(x => x.CreatedAt).Skip((query.Page - 1) * query.PageSize).Take(query.PageSize)
            join u in db.Users.AsNoTracking() on a.UserId equals u.Id into users
            from u in users.DefaultIfEmpty()
            select new AuditLogDto(
                a.Id,
                a.UserId,
                u != null ? u.Username : null,
                a.BranchId,
                a.EntityName,
                a.EntityId,
                a.Action,
                a.OldValues,
                a.NewValues,
                a.TraceId,
                a.IpAddress,
                a.CreatedAt)
        ).ToListAsync(ct);

        return PagedResult<AuditLogDto>.Create(items, query.Page, query.PageSize, total);
    }

    public async Task<PagedResult<ActivityLogDto>> GetActivityLogsAsync(ActivityLogQuery query, CancellationToken ct = default)
    {
        var q = db.ActivityLogs.AsNoTracking();

        if (query.UserId.HasValue)
            q = q.Where(x => x.UserId == query.UserId.Value);

        if (!string.IsNullOrWhiteSpace(query.EventType))
            q = q.Where(x => x.EventType == query.EventType);

        if (query.From.HasValue)
            q = q.Where(x => x.CreatedAt >= query.From.Value);

        if (query.To.HasValue)
            q = q.Where(x => x.CreatedAt <= query.To.Value);

        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var term = $"%{query.Search.Trim()}%";
            q = q.Where(x =>
                (x.Username != null && EF.Functions.ILike(x.Username, term)) ||
                EF.Functions.ILike(x.Description, term));
        }

        var total = await q.CountAsync(ct);

        var items = await q
            .OrderByDescending(x => x.CreatedAt)
            .Skip((query.Page - 1) * query.PageSize)
            .Take(query.PageSize)
            .Select(x => new ActivityLogDto(
                x.Id,
                x.UserId,
                x.Username,
                x.BranchId,
                x.EventType,
                x.Description,
                x.IpAddress,
                x.UserAgent,
                x.CreatedAt))
            .ToListAsync(ct);

        return PagedResult<ActivityLogDto>.Create(items, query.Page, query.PageSize, total);
    }
}

