import { NextResponse } from "next/server";
import { projects } from "@/lib/projects";

export const dynamic = "force-static";

export function GET() {
  return NextResponse.json({
    count: projects.length,
    generated: new Date().toISOString(),
    projects,
  });
}
