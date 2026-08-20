// A plain-text input that displays thousands separators live (e.g. "300,000")
// while the value passed to onChange stays a clean numeric string ("300000")
// so all existing Number(...) math elsewhere keeps working unchanged.
export default function NumberField({
  value,
  onChange,
  placeholder = "0",
  allowDecimal = true,
  disabled = false,
  className = "input",
}) {
  const display = value === "" || value === undefined || value === null ? "" : formatWithCommas(String(value));

  function handleChange(e) {
    let raw = e.target.value.replace(/,/g, "");
    if (allowDecimal) {
      raw = raw.replace(/[^\d.]/g, "");
      const parts = raw.split(".");
      if (parts.length > 2) raw = parts[0] + "." + parts.slice(1).join("");
    } else {
      raw = raw.replace(/\D/g, "");
    }
    onChange(raw);
  }

  return (
    <input
      type="text"
      inputMode="decimal"
      value={display}
      onChange={handleChange}
      placeholder={placeholder}
      disabled={disabled}
      className={className}
    />
  );
}

function formatWithCommas(raw) {
  const [intPart, decPart] = raw.split(".");
  const withCommas = (intPart || "").replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return decPart !== undefined ? `${withCommas}.${decPart}` : withCommas;
}
