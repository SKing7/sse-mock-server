interface PresetFile {
  files: string[];
}
// Function to fetch preset data
export async function getPresetFiles(): Promise<PresetFile> {
  const response = await fetch("/api/preset-data");
  if (!response.ok) {
    throw new Error(`Failed to fetch preset data: ${response.statusText}`);
  }
  return response.json();
}