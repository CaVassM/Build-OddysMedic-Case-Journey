// Iconos de línea, todos decorativos: el significado siempre va también en texto.
import type { ReactNode } from "react";
import type { CompetencyId } from "./engine";

function Icon({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={`icon ${className}`}
      fill="none"
      focusable="false"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
      viewBox="0 0 20 20"
    >
      {children}
    </svg>
  );
}

export function ArrowRightIcon() {
  return (
    <Icon className="icon-arrow">
      <path d="M4 10h11m-4.5-4.5L15 10l-4.5 4.5" />
    </Icon>
  );
}

export function ClockIcon() {
  return (
    <Icon>
      <circle cx="10" cy="10" r="7.5" />
      <path d="M10 5.8V10l2.8 1.8" />
    </Icon>
  );
}

export function RouteIcon() {
  return (
    <Icon>
      <circle cx="4.5" cy="14.5" r="1.8" />
      <circle cx="15.5" cy="5.5" r="1.8" />
      <path d="M6.3 14.5H12a2.5 2.5 0 0 0 0-5H8a2.5 2.5 0 0 1 0-5h5.7" />
    </Icon>
  );
}

export function ChevronIcon() {
  return (
    <Icon className="icon-chevron">
      <path d="m5.5 8 4.5 4.5L14.5 8" />
    </Icon>
  );
}

export function BookmarkIcon() {
  return (
    <Icon>
      <path d="M5.5 3.5h9a1 1 0 0 1 1 1V16.5L10 13l-5.5 3.5V4.5a1 1 0 0 1 1-1Z" />
    </Icon>
  );
}

export function InfoIcon() {
  return (
    <Icon>
      <circle cx="10" cy="10" r="7.5" />
      <path d="M10 9.2v4.3M10 6.4v.1" />
    </Icon>
  );
}

export function CompassIcon() {
  return (
    <Icon>
      <circle cx="10" cy="10" r="7.5" />
      <path d="m12.8 7.2-1.5 4.1-4.1 1.5 1.5-4.1 4.1-1.5Z" />
    </Icon>
  );
}

export function TrendIcon({ direction }: { direction: "up" | "down" | "flat" }) {
  return (
    <Icon className={`icon-trend ${direction}`}>
      {direction === "up" && <path d="M10 16V4.5M5 9.5l5-5 5 5" />}
      {direction === "down" && <path d="M10 4v11.5M5 10.5l5 5 5-5" />}
      {direction === "flat" && <path d="M4 10h12" />}
    </Icon>
  );
}

export function EyeIcon({ hidden }: { hidden: boolean }) {
  return (
    <Icon>
      <path d="M2.5 10S5.2 4.8 10 4.8 17.5 10 17.5 10 14.8 15.2 10 15.2 2.5 10 2.5 10Z" />
      <circle cx="10" cy="10" r="2.2" />
      {hidden && <path d="m3.5 16.5 13-13" />}
    </Icon>
  );
}

export function FlaskIcon() {
  return (
    <Icon>
      <path d="M8 3.5h4M8.8 3.5v4.6L4.6 15a1.3 1.3 0 0 0 1.1 2h8.6a1.3 1.3 0 0 0 1.1-2l-4.2-6.9V3.5" />
      <path d="M6.6 12.4h6.8" />
    </Icon>
  );
}

function PillIcon() {
  return (
    <Icon>
      <rect height="7" rx="3.5" transform="rotate(-45 10 10)" width="15" x="2.5" y="6.5" />
      <path d="m7.6 7.6 4.8 4.8" />
    </Icon>
  );
}

function MagnifierIcon() {
  return (
    <Icon>
      <circle cx="8.8" cy="8.8" r="5.3" />
      <path d="m12.8 12.8 4 4" />
    </Icon>
  );
}

function ChartIcon() {
  return (
    <Icon>
      <path d="M3.5 3.5v13h13" />
      <path d="m6.5 12.5 3-3.5 2.5 2 3.5-4.5" />
    </Icon>
  );
}

function StethoscopeIcon() {
  return (
    <Icon>
      <path d="M5 3.5v4.5a3.5 3.5 0 0 0 7 0V3.5M3.8 3.5H6.2M10.8 3.5h2.4" />
      <path d="M8.5 11.5v1.2A3.3 3.3 0 0 0 11.8 16h.4a3.3 3.3 0 0 0 3.3-3.3V11" />
      <circle cx="15.5" cy="9.4" r="1.6" />
    </Icon>
  );
}

function ListIcon() {
  return (
    <Icon>
      <path d="M7.5 5h9M7.5 10h9M7.5 15h9" />
      <path d="M3.5 5h.1M3.5 10h.1M3.5 15h.1" />
    </Icon>
  );
}

/** Un ícono por competencia, para reconocerla de un vistazo. */
export function CompetencyIcon({ id }: { id: CompetencyId }) {
  switch (id) {
    case "interpretacion":
      return <ChartIcon />;
    case "manejo":
      return <PillIcon />;
    case "seleccion":
      return <MagnifierIcon />;
    case "formulacion":
      return <StethoscopeIcon />;
    case "priorizacion":
      return <ListIcon />;
    default:
      return <CompassIcon />;
  }
}
