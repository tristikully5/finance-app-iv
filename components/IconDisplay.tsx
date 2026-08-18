import { defaultIconValue, isCustomIcon } from "@/lib/icon-options";

type IconDisplayProps = {
  icon: string | null | undefined;
  alt?: string;
  className?: string;
};

export default function IconDisplay({ icon, alt = "", className = "h-5 w-5" }: IconDisplayProps) {
  const src = isCustomIcon(icon) ? icon : defaultIconValue;
  return <img src={src} alt={alt} className={className} />;
}
