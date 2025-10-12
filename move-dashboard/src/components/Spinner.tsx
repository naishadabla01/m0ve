export default function Spinner({ size = 18 }: { size?: number }) {
  return (
    <span
      className="inline-block animate-spin rounded-full border-2 border-green-400 border-t-transparent"
      style={{ width: size, height: size }}
      aria-label="Loading"
    />
  );
}
