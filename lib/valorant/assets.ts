const AGENT_ASSETS = {
  Astra: { portrait: "https://media.valorant-api.com/agents/41fb69c1-4189-7b37-f117-bcaf1e96f1bf/fullportrait.png", role: "Controller" },
  Breach: { portrait: "https://media.valorant-api.com/agents/5f8d3a7f-467b-97f3-062c-13acf203c006/fullportrait.png", role: "Initiator" },
  Brimstone: { portrait: "https://media.valorant-api.com/agents/9f0d8ba9-4140-b941-57d3-a7ad57c6b417/fullportrait.png", role: "Controller" },
  Chamber: { portrait: "https://media.valorant-api.com/agents/22697a3d-45bf-8dd7-4fec-84a9e28c69d7/fullportrait.png", role: "Sentinel" },
  Clove: { portrait: "https://media.valorant-api.com/agents/1dbf2edd-4729-0984-3115-daa5eed44993/fullportrait.png", role: "Controller" },
  Cypher: { portrait: "https://media.valorant-api.com/agents/117ed9e3-49f3-6512-3ccf-0cada7e3823b/fullportrait.png", role: "Sentinel" },
  Deadlock: { portrait: "https://media.valorant-api.com/agents/cc8b64c8-4b25-4ff9-6e7f-37b4da43d235/fullportrait.png", role: "Sentinel" },
  Fade: { portrait: "https://media.valorant-api.com/agents/dade69b4-4f5a-8528-247b-219e5a1facd6/fullportrait.png", role: "Initiator" },
  Gekko: { portrait: "https://media.valorant-api.com/agents/e370fa57-4757-3604-3648-499e1f642d3f/fullportrait.png", role: "Initiator" },
  Harbor: { portrait: "https://media.valorant-api.com/agents/95b78ed7-4637-86d9-7e41-71ba8c293152/fullportrait.png", role: "Controller" },
  Iso: { portrait: "https://media.valorant-api.com/agents/0e38b510-41a8-5780-5e8f-568b2a4f2d6c/fullportrait.png", role: "Duelist" },
  Jett: { portrait: "https://media.valorant-api.com/agents/add6443a-41bd-e414-f6ad-e58d267f4e95/fullportrait.png", role: "Duelist" },
  "KAY/O": { portrait: "https://media.valorant-api.com/agents/601dbbe7-43ce-be57-2a40-4abd24953621/fullportrait.png", role: "Initiator" },
  Killjoy: { portrait: "https://media.valorant-api.com/agents/1e58de9c-4950-5125-93e9-a0aee9f98746/fullportrait.png", role: "Sentinel" },
  Miks: { portrait: "https://media.valorant-api.com/agents/7c8a4701-4de6-9355-b254-e09bc2a34b72/fullportrait.png", role: "Controller" },
  Neon: { portrait: "https://media.valorant-api.com/agents/bb2a4828-46eb-8cd1-e765-15848195d751/fullportrait.png", role: "Duelist" },
  Omen: { portrait: "https://media.valorant-api.com/agents/8e253930-4c05-31dd-1b6c-968525494517/fullportrait.png", role: "Controller" },
  Phoenix: { portrait: "https://media.valorant-api.com/agents/eb93336a-449b-9c1b-0a54-a891f7921d69/fullportrait.png", role: "Duelist" },
  Raze: { portrait: "https://media.valorant-api.com/agents/f94c3b30-42be-e959-889c-5aa313dba261/fullportrait.png", role: "Duelist" },
  Reyna: { portrait: "https://media.valorant-api.com/agents/a3bfb853-43b2-7238-a4f1-ad90e9e46bcc/fullportrait.png", role: "Duelist" },
  Sage: { portrait: "https://media.valorant-api.com/agents/569fdd95-4d10-43ab-ca70-79becc718b46/fullportrait.png", role: "Sentinel" },
  Skye: { portrait: "https://media.valorant-api.com/agents/6f2a04ca-43e0-be17-7f36-b3908627744d/fullportrait.png", role: "Initiator" },
  Sova: { portrait: "https://media.valorant-api.com/agents/320b2a48-4d9b-a075-30f1-1f93a9b638fa/fullportrait.png", role: "Initiator" },
  Tejo: { portrait: "https://media.valorant-api.com/agents/b444168c-4e35-8076-db47-ef9bf368f384/fullportrait.png", role: "Initiator" },
  Veto: { portrait: "https://media.valorant-api.com/agents/92eeef5d-43b5-1d4a-8d03-b3927a09034b/fullportrait.png", role: "Sentinel" },
  Viper: { portrait: "https://media.valorant-api.com/agents/707eab51-4836-f488-046a-cda6bf494859/fullportrait.png", role: "Controller" },
  Vyse: { portrait: "https://media.valorant-api.com/agents/efba5359-4016-a1e5-7626-b1ae76895940/fullportrait.png", role: "Sentinel" },
  Waylay: { portrait: "https://media.valorant-api.com/agents/df1cb487-4902-002e-5c17-d28e83e78588/fullportrait.png", role: "Duelist" },
  Yoru: { portrait: "https://media.valorant-api.com/agents/7f94d92c-4234-0a36-9646-3a87eb8b5c89/fullportrait.png", role: "Duelist" },
} as const;

const MAP_ASSETS = {
  Abyss: { splash: "https://media.valorant-api.com/maps/224b0a95-48b9-f703-1bd8-67aca101a61f/splash.png", icon: "https://media.valorant-api.com/maps/224b0a95-48b9-f703-1bd8-67aca101a61f/listviewicon.png" },
  Ascent: { splash: "https://media.valorant-api.com/maps/7eaecc1b-4337-bbf6-6ab9-04b8f06b3319/splash.png", icon: "https://media.valorant-api.com/maps/7eaecc1b-4337-bbf6-6ab9-04b8f06b3319/listviewicon.png" },
  Bind: { splash: "https://media.valorant-api.com/maps/2c9d57ec-4431-9c5e-2939-8f9ef6dd5cba/splash.png", icon: "https://media.valorant-api.com/maps/2c9d57ec-4431-9c5e-2939-8f9ef6dd5cba/listviewicon.png" },
  Breeze: { splash: "https://media.valorant-api.com/maps/2fb9a4fd-47b8-4e7d-a969-74b4046ebd53/splash.png", icon: "https://media.valorant-api.com/maps/2fb9a4fd-47b8-4e7d-a969-74b4046ebd53/listviewicon.png" },
  Corrode: { splash: "https://media.valorant-api.com/maps/1c18ab1f-420d-0d8b-71d0-77ad3c439115/splash.png", icon: "https://media.valorant-api.com/maps/1c18ab1f-420d-0d8b-71d0-77ad3c439115/listviewicon.png" },
  Fracture: { splash: "https://media.valorant-api.com/maps/b529448b-4d60-346e-e89e-00a4c527a405/splash.png", icon: "https://media.valorant-api.com/maps/b529448b-4d60-346e-e89e-00a4c527a405/listviewicon.png" },
  Haven: { splash: "https://media.valorant-api.com/maps/2bee0dc9-4ffe-519b-1cbd-7fbe763a6047/splash.png", icon: "https://media.valorant-api.com/maps/2bee0dc9-4ffe-519b-1cbd-7fbe763a6047/listviewicon.png" },
  Icebox: { splash: "https://media.valorant-api.com/maps/e2ad5c54-4114-a870-9641-8ea21279579a/splash.png", icon: "https://media.valorant-api.com/maps/e2ad5c54-4114-a870-9641-8ea21279579a/listviewicon.png" },
  Lotus: { splash: "https://media.valorant-api.com/maps/2fe4ed3a-450a-948b-6d6b-e89a78e680a9/splash.png", icon: "https://media.valorant-api.com/maps/2fe4ed3a-450a-948b-6d6b-e89a78e680a9/listviewicon.png" },
  Pearl: { splash: "https://media.valorant-api.com/maps/fd267378-4d1d-484f-ff52-77821ed10dc2/splash.png", icon: "https://media.valorant-api.com/maps/fd267378-4d1d-484f-ff52-77821ed10dc2/listviewicon.png" },
  Split: { splash: "https://media.valorant-api.com/maps/d960549e-485c-e861-8d71-aa9d1aed12a2/splash.png", icon: "https://media.valorant-api.com/maps/d960549e-485c-e861-8d71-aa9d1aed12a2/listviewicon.png" },
  Sunset: { splash: "https://media.valorant-api.com/maps/92584fbe-486a-b1b2-9faa-39b0f486b498/splash.png", icon: "https://media.valorant-api.com/maps/92584fbe-486a-b1b2-9faa-39b0f486b498/listviewicon.png" },
  "The Range": { splash: "https://media.valorant-api.com/maps/ee613ee9-28b7-4beb-9666-08db13bb2244/splash.png", icon: "https://media.valorant-api.com/maps/ee613ee9-28b7-4beb-9666-08db13bb2244/listviewicon.png" },
} as const;

function normalizeKey(value?: string | null) {
  return (value ?? "")
    .replace(/^\/+|\/+$/g, "")
    .replace(/\s+/g, " ")
    .replace(/^competitive\s*-\s*/i, "")
    .replace(/^unrated\s*-\s*/i, "")
    .trim();
}

export function getAgentAsset(agent?: string | null) {
  const key = normalizeKey(agent) as keyof typeof AGENT_ASSETS;
  return AGENT_ASSETS[key] ?? null;
}

export function getAgentIcon(agent?: string | null) {
  const asset = getAgentAsset(agent);
  if (!asset) return null;
  return asset.portrait.replace(/fullportrait\.png$/i, "displayicon.png");
}

export function getMapAsset(map?: string | null) {
  const key = normalizeKey(map) as keyof typeof MAP_ASSETS;
  return MAP_ASSETS[key] ?? null;
}
