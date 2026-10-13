using System;
using System.IO;
using System.Text.Json;
using System.Threading.Tasks;
using NMKBim.Core.Models;

namespace NMKBim.Desktop.Services
{
    public interface IModelLoaderService
    {
        Task<ModelDocument?> LoadFromFileAsync(string filePath);
        ModelDocument? LoadFromJson(string json);
    }

    public class ModelLoaderService : IModelLoaderService
    {
        private static readonly JsonSerializerOptions JsonOptions = new()
        {
            PropertyNameCaseInsensitive = true,
            ReadCommentHandling = JsonCommentHandling.Skip,
            AllowTrailingCommas = true
        };

        public async Task<ModelDocument?> LoadFromFileAsync(string filePath)
        {
            if (!File.Exists(filePath)) return null;
            try
            {
                using var stream = File.OpenRead(filePath);
                return await JsonSerializer.DeserializeAsync<ModelDocument>(stream, JsonOptions);
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine($"Error loading 3D model from {filePath}: {ex.Message}");
                return null;
            }
        }

        public ModelDocument? LoadFromJson(string json)
        {
            try
            {
                return JsonSerializer.Deserialize<ModelDocument>(json, JsonOptions);
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine($"Error parsing JSON model: {ex.Message}");
                return null;
            }
        }
    }
}
