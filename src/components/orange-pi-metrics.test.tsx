import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { OrangePiMetrics } from "./orange-pi-metrics";

afterEach(cleanup);

it("formats Theia metrics, computes memory usage and exposes progress values", () => {
  render(<OrangePiMetrics fields={{ cpu_pct: 0.7537688442211056, disk_used_pct: 49.57253247399013, load_1: 0.03, memory_total_mb: 969, memory_used_mb: 314, temperature_c: 53.198, uptime_s: 23757 }} />);
  for (const value of ["0,8%", "49,6%", "32,4%", "314 / 969 MB em uso", "53,2 °C", "0,03", "6h 35min"]) {
    expect(screen.getByText(value)).toBeInTheDocument();
  }
  expect(screen.getByRole("progressbar", { name: "CPU: 0,8%" })).toHaveAttribute("aria-valuenow", "0.7537688442211056");
  expect(Number(screen.getByRole("progressbar", { name: "Memória: 32,4%" }).getAttribute("aria-valuenow"))).toBeCloseTo(32.4045);
});

it("preserves zero measurements instead of treating them as missing", () => {
  render(<OrangePiMetrics fields={{ cpu_pct: 0, disk_used_pct: 0, load_1: 0, memory_total_mb: 969, memory_used_mb: 0, temperature_c: 0, uptime_s: 0 }} />);
  expect(screen.getAllByText("0%")).toHaveLength(3);
  expect(screen.getByText("0 °C")).toBeInTheDocument();
  expect(screen.getByText("0min")).toBeInTheDocument();
  expect(screen.getByRole("progressbar", { name: "CPU: 0%" })).toHaveAttribute("aria-valuenow", "0");
});

it("does not show missing or invalid measurements as zero or draw invalid progress", () => {
  render(<OrangePiMetrics fields={{ cpu_pct: "12.5", disk_used_pct: 105, load_1: NaN, memory_total_mb: 0, memory_used_mb: 12, temperature_c: null, uptime_s: -1 }} />);
  expect(screen.getAllByText("—")).toHaveLength(6);
  expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
});
