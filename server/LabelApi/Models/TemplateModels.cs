namespace LabelApi.Models;

public class TemplateRecordDto
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
}

public class ComponentRecordDto
{
    public int Id { get; set; }
    public string TemplateId { get; set; } = string.Empty;
    public string ComponentId { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;

    public double XLeftTop { get; set; }
    public double YLeftTop { get; set; }
    public double XRightTop { get; set; }
    public double YRightTop { get; set; }
    public double XLeftBottom { get; set; }
    public double YLeftBottom { get; set; }
    public double XRightBottom { get; set; }
    public double YRightBottom { get; set; }

    public string? DataJson { get; set; }
    // Not stored directly; serialized into DataJson in controller
    public object? Data { get; set; }
}

public class TemplatePayloadDto
{
    public TemplateRecordDto Template { get; set; } = new();
    public List<ComponentRecordDto> Components { get; set; } = new();
    public int? Width { get; set; }
    public int? Height { get; set; }
}
