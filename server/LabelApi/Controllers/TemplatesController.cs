using LabelApi.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using Npgsql;
using System.Text.Json;

namespace LabelApi.Controllers;

[ApiController]
[Route("api/[controller]")]
public class TemplatesController : ControllerBase
{
    private readonly IConfiguration _config;

    public TemplatesController(IConfiguration config)
    {
        _config = config;
    }

    [HttpPost]
    public async Task<IActionResult> SaveTemplate([FromBody] TemplatePayloadDto payload)
    {
        if (payload == null || payload.Components == null)
            return BadRequest("Invalid payload");

        // Serialize the incoming `Data` object (if provided) into DataJson for storage
        foreach (var c in payload.Components)
        {
            if (c.Data != null)
            {
                c.DataJson = JsonSerializer.Serialize(c.Data);
                c.Data = null; // do not persist dynamic object directly
            }
        }

        var connStr = _config.GetConnectionString("LabelDb");

        const string insertSql = @"
            INSERT INTO Components (
            TemplateId, ComponentId, Name,
            XLeftTop, YLeftTop, XRightTop, YRightTop,
            XLeftBottom, YLeftBottom, XRightBottom, YRightBottom,
            DataJson
            ) VALUES (
            @TemplateId, @ComponentId, @Name,
            @XLeftTop, @YLeftTop, @XRightTop, @YRightTop,
            @XLeftBottom, @YLeftBottom, @XRightBottom, @YRightBottom,
            @DataJson
            );";

        await using var conn = new NpgsqlConnection(connStr);
        await conn.OpenAsync();
        foreach (var c in payload.Components)
        {
            await using var cmd = new NpgsqlCommand(insertSql, conn);
            cmd.Parameters.AddWithValue("@TemplateId", c.TemplateId);
            cmd.Parameters.AddWithValue("@ComponentId", c.ComponentId);
            cmd.Parameters.AddWithValue("@Name", c.Name);
            cmd.Parameters.AddWithValue("@XLeftTop", c.XLeftTop);
            cmd.Parameters.AddWithValue("@YLeftTop", c.YLeftTop);
            cmd.Parameters.AddWithValue("@XRightTop", c.XRightTop);
            cmd.Parameters.AddWithValue("@YRightTop", c.YRightTop);
            cmd.Parameters.AddWithValue("@XLeftBottom", c.XLeftBottom);
            cmd.Parameters.AddWithValue("@YLeftBottom", c.YLeftBottom);
            cmd.Parameters.AddWithValue("@XRightBottom", c.XRightBottom);
            cmd.Parameters.AddWithValue("@YRightBottom", c.YRightBottom);
            cmd.Parameters.AddWithValue("@DataJson", (object?)c.DataJson ?? DBNull.Value);
            await cmd.ExecuteNonQueryAsync();
        }

        return Ok(new { message = "Saved", count = payload.Components.Count });
    }

    [HttpGet]
    public async Task<IActionResult> ListComponents()
    {
        var connStr = _config.GetConnectionString("LabelDb");

        const string selectSql = @"SELECT Id, TemplateId, ComponentId, Name,
            XLeftTop, YLeftTop, XRightTop, YRightTop,
            XLeftBottom, YLeftBottom, XRightBottom, YRightBottom,
            DataJson
            FROM Components
            ORDER BY Id DESC
            LIMIT 100";

        var results = new List<ComponentRecordDto>();
        await using var conn = new NpgsqlConnection(connStr);
        await conn.OpenAsync();
        await using var cmd = new NpgsqlCommand(selectSql, conn);
        await using var reader = await cmd.ExecuteReaderAsync();
        while (await reader.ReadAsync())
        {
            results.Add(new ComponentRecordDto
            {
                Id = reader.GetInt32(0),
                TemplateId = reader.GetString(1),
                ComponentId = reader.GetString(2),
                Name = reader.GetString(3),
                XLeftTop = reader.GetDouble(4),
                YLeftTop = reader.GetDouble(5),
                XRightTop = reader.GetDouble(6),
                YRightTop = reader.GetDouble(7),
                XLeftBottom = reader.GetDouble(8),
                YLeftBottom = reader.GetDouble(9),
                XRightBottom = reader.GetDouble(10),
                YRightBottom = reader.GetDouble(11),
                DataJson = reader.IsDBNull(12) ? null : reader.GetString(12)
            });
        }

        return Ok(results);
    }
}
