export const MAX_FILE_SIZE = 20 * 1024 * 1024;
export const ALLOWED_EXTENSIONS = ["pdf", "dwg", "dxf", "zip", "jpg", "jpeg", "png", "webp"];

export function phoneDigits(value: string) {
  const digits = value.replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("8")) return `7${digits.slice(1, 11)}`;
  if (digits.startsWith("7")) return digits.slice(0, 11);
  return `7${digits.slice(0, 10)}`;
}

export function formatRussianPhone(value: string) {
  const digits = phoneDigits(value);
  if (!digits) return "";
  const local = digits.slice(1);
  let result = "+7";
  if (local.length) result += ` (${local.slice(0, 3)}`;
  if (local.length >= 3) result += ")";
  if (local.length > 3) result += ` ${local.slice(3, 6)}`;
  if (local.length > 6) result += `-${local.slice(6, 8)}`;
  if (local.length > 8) result += `-${local.slice(8, 10)}`;
  return result;
}

export function validateRussianPhone(value: string) {
  return phoneDigits(value).length === 11;
}

export function validateProjectFile(file?: File) {
  if (!file) return "";
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (!ALLOWED_EXTENSIONS.includes(extension)) return "Допустимы PDF, DWG, DXF, ZIP, JPG, PNG и WEBP.";
  if (file.size > MAX_FILE_SIZE) return "Файл должен быть не больше 20 МБ.";
  return "";
}

