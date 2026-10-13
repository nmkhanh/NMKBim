using System;
using System.Windows;

namespace NMKBim.Desktop
{
    public partial class App : Application
    {
        protected override void OnStartup(StartupEventArgs e)
        {
            base.OnStartup(e);

            // Bắt ngoại lệ toàn cục tránh crash văng app
            AppDomain.CurrentDomain.UnhandledException += (s, args) =>
            {
                var ex = args.ExceptionObject as Exception;
                MessageBox.Show($"Lỗi hệ thống: {ex?.Message}\n\n{ex?.StackTrace}", "NMKBim Error", MessageBoxButton.OK, MessageBoxImage.Error);
            };

            DispatcherUnhandledException += (s, args) =>
            {
                MessageBox.Show($"Lỗi ứng dụng: {args.Exception.Message}\n\n{args.Exception.StackTrace}", "NMKBim Error", MessageBoxButton.OK, MessageBoxImage.Error);
                args.Handled = true; // Ngăn không cho ứng dụng bị crash
            };
        }
    }
}
