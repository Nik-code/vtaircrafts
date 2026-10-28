import type { MetadataRoute } from "next";
import { getAircraft, getArchive, getMeta, getOperators, getPastOperators, getTraining } from "@/lib/data";
import { getOwnerPages, getRegister, getTypes } from "@/lib/registry";

export const dynamic = "force-static";

const ORIGIN = "https://vtaircrafts.in";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = getMeta().generatedAt;
  const page = (path: string, priority: number): MetadataRoute.Sitemap[number] => ({ url: `${ORIGIN}${path}`, lastModified, priority });
  return [
    page("/", 1),
    ...["/fleet", "/operators", "/types", "/stats", "/owners", "/flying-schools", "/log", "/data", "/register"].map((p) => page(p, 0.8)),
    ...[...getRegister().keys()].map((l) => page(`/register/${l}`, 0.7)),
    ...getOperators().map((o) => page(`/operators/${o.id}`, 0.7)),
    ...getTypes().map((t) => page(`/types/${t.slug}`, 0.7)),
    ...getOwnerPages().map((o) => page(`/owners/${o.slug}`, 0.5)),
    ...(getTraining()?.ftos ?? []).map((f) => page(`/flying-schools/${f.id}`, 0.5)),
    ...getAircraft().map((a) => page(`/aircraft/${a.reg}`, 0.6)),
    ...getPastOperators().map((o) => page(`/operators/${o.id}`, 0.4)),
    ...getArchive().map((a) => page(`/aircraft/${a.reg}`, 0.3)),
  ];
}
