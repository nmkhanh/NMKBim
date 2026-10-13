using Autodesk.Revit.DB;

namespace NMKBim_Revit.Services
{
    public static class ElementIdExtensions
    {
        /// <summary>
        /// Lấy giá trị định danh của ElementId tương thích cả Revit <= 2023 (IntegerValue) và Revit >= 2024 (Value 64-bit).
        /// </summary>
        public static long GetIdValue(this ElementId id)
        {
            if (id == null) return -1;
#if NET48
            return id.IntegerValue;
#else
            return id.Value;
#endif
        }
    }
}
