# LabelApi (.NET 8 Web API)

This is a minimal API to persist template component coordinates coming from the Angular builder. It uses plain ADO.NET with `Microsoft.Data.SqlClient` (no Entity Framework).

## Requirements
- .NET 8 SDK
- SQL Server (LocalDB or full SQL Server)

## Setup
1. Navigate to `server/LabelApi/`
2. Update `appsettings.json` connection string `ConnectionStrings:LabelDb` if needed.
3. Create database and tables manually using the DDL below.
4. Run the API:

```bash
# from server/LabelApi
dotnet restore
dotnet run
```

Swagger UI will be at `http://localhost:5088/swagger` (port may vary per `launchSettings.json`).

## Database schema (manual DDL)
```sql
CREATE TABLE dbo.Components (
  Id INT IDENTITY(1,1) PRIMARY KEY,
  TemplateId NVARCHAR(100) NOT NULL,
  ComponentId NVARCHAR(100) NOT NULL,
  Name NVARCHAR(100) NOT NULL,
  XLeftTop FLOAT NOT NULL,
  YLeftTop FLOAT NOT NULL,
  XRightTop FLOAT NOT NULL,
  YRightTop FLOAT NOT NULL,
  XLeftBottom FLOAT NOT NULL,
  YLeftBottom FLOAT NOT NULL,
  XRightBottom FLOAT NOT NULL,
  YRightBottom FLOAT NOT NULL,
  DataJson NVARCHAR(MAX) NULL,
  CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_Components_CreatedAt DEFAULT SYSUTCDATETIME()
);
```

## CORS
CORS is enabled for `http://localhost:4200` by default. Change `Cors:AllowedOrigin` in `appsettings.json` if needed.

## Endpoints
- POST `/api/templates` - saves an incoming payload. Expects the Angular payload with components and corner percentages. Stores each component (one row per component) including `DataJson`.
- GET `/api/templates` - lists the latest 100 components.

## Payload shape (Angular side)
```
{
  "template": { "id": "T-USER", "name": "User Template" },
  "width": 500,
  "height": 800,
  "components": [
    {
      "templateId": "T-USER",
      "componentId": "Logo-169497...",
      "name": "Logo",
      "xLeftTop": 12,
      "yLeftTop": 10,
      "xRightTop": 35,
      "yRightTop": 10,
      "xLeftBottom": 12,
      "yLeftBottom": 22,
      "xRightBottom": 35,
      "yRightBottom": 22,
      "data": { "text": "amazon.com" }
    }
  ]
}
```
