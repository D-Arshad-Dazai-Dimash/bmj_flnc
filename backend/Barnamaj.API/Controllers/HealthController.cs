using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Diagnostics.HealthChecks;

namespace Barnamaj.API.Controllers;

/// <summary>
/// Health check endpoint — используется Docker, Kubernetes, load balancer
/// для проверки работоспособности сервиса
/// </summary>
[ApiController]
[Route("api/[controller]")]
public class HealthController : ControllerBase
{
    private readonly HealthCheckService _healthCheckService;

    public HealthController(HealthCheckService healthCheckService)
    {
        _healthCheckService = healthCheckService;
    }

    /// <summary>
    /// Liveness: сервис запущен
    /// </summary>
    [HttpGet("live")]
    public IActionResult Live() => Ok(new
    {
        status = "alive",
        service = "Barnamaj API",
        timestamp = DateTime.UtcNow
    });

    /// <summary>
    /// Readiness: сервис готов принимать запросы (БД доступна)
    /// </summary>
    [HttpGet("ready")]
    public async Task<IActionResult> Ready()
    {
        var report = await _healthCheckService.CheckHealthAsync();
        var result = new
        {
            status = report.Status.ToString(),
            checks = report.Entries.Select(e => new
            {
                name = e.Key,
                status = e.Value.Status.ToString(),
                duration = e.Value.Duration.TotalMilliseconds
            }),
            timestamp = DateTime.UtcNow
        };

        return report.Status == HealthStatus.Healthy
            ? Ok(result)
            : StatusCode(503, result);
    }
}
