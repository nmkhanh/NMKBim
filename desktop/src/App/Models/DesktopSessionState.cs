using System;
using System.Collections.Generic;
using System.IO;
using System.Text.Json;

namespace NMKBim.Desktop.Models
{
    public class DesktopSessionState
    {
        public List<string> LoadedFilePaths { get; set; } = new();
        public Dictionary<string, string> ColorOverrides { get; set; } = new();
        public List<ElementGroupDto> Groups { get; set; } = new();
        public string LayoutMode { get; set; } = "1";

        private static string StateFilePath => Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
            "NMKBim",
            "session_state.json"
        );

        public static void Save(DesktopSessionState state)
        {
            try
            {
                string dir = Path.GetDirectoryName(StateFilePath)!;
                if (!Directory.Exists(dir))
                {
                    Directory.CreateDirectory(dir);
                }
                string json = JsonSerializer.Serialize(state, new JsonSerializerOptions { WriteIndented = true });
                File.WriteAllText(StateFilePath, json);
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine($"Failed to save session state: {ex.Message}");
            }
        }

        public static DesktopSessionState Load()
        {
            try
            {
                if (File.Exists(StateFilePath))
                {
                    string json = File.ReadAllText(StateFilePath);
                    return JsonSerializer.Deserialize<DesktopSessionState>(json) ?? new DesktopSessionState();
                }
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine($"Failed to load session state: {ex.Message}");
            }
            return new DesktopSessionState();
        }
    }

    public class ElementGroupDto
    {
        public string Id { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public List<string> ObjectIds { get; set; } = new();
        public string? Color { get; set; }
    }
}
