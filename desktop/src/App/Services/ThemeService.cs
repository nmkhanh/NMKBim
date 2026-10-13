using System;
using System.Windows;

namespace NMKBim.Desktop.Services
{
    public interface IThemeService
    {
        string CurrentTheme { get; }
        void SetTheme(string themeName);
        void ToggleTheme();
    }

    public class ThemeService : IThemeService
    {
        public string CurrentTheme { get; private set; } = "Dark";

        public void SetTheme(string themeName)
        {
            CurrentTheme = themeName;
            var uri = new Uri($"pack://application:,,,/Themes/Theme.{themeName}.xaml", UriKind.Absolute);
            var newDict = new ResourceDictionary { Source = uri };

            // Thay thế từ điển theme cũ
            var appDicts = Application.Current.Resources.MergedDictionaries;
            for (int i = 0; i < appDicts.Count; i++)
            {
                if (appDicts[i].Source != null && appDicts[i].Source.OriginalString.Contains("Theme."))
                {
                    appDicts[i] = newDict;
                    return;
                }
            }
            appDicts.Add(newDict);
        }

        public void ToggleTheme()
        {
            SetTheme(CurrentTheme == "Dark" ? "Light" : "Dark");
        }
    }
}
