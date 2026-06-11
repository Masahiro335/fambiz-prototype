import Link from 'next/link';

export function HomeButton() {
  return (
    <Link
      href="/"
      replace
      className="text-xl font-bold text-blue-600 shrink-0 hover:opacity-80 transition-opacity"
    >
      FamBiz
    </Link>
  );
}
