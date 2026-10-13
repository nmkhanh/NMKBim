using System;
using System.Windows;

namespace NMKBim.Desktop.Services
{
    public interface ILocalizationService
    {
        string CurrentLanguage { get; }
        void SetLanguage(string langCode);
    }

    public class LocalizationService : ILocalizationService
    {
        public string CurrentLanguage { get; private set; } = "en";

        public void SetLanguage(string langCode)
        {
            CurrentLanguage = langCode;
            var uri = new Uri($"pack://application:,,,/Localization/Strings.{langCode}.xaml", UriKind.Absolute);
            var newDict = new ResourceDictionary { Source = uri };

            var appDicts = Application.Current.Resources.MergedDictionaries;
            for (int i = 0; i < appDicts.Count; i++)
            {
                if (appDicts[i].Source != null && appDicts[i].Source.OriginalString.Contains("Strings."))
                {
                    appDicts[i] = newDict;
                    return;
                }
            }
            appDicts.Add(newDict);
        }
    }
}
