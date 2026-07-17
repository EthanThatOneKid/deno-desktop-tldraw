const paths = ["dist", "dist-desktop"];

for (const path of paths) {
  try {
    await Deno.remove(path, { recursive: true });
    console.log(`Removed ${path}`);
  } catch (error) {
    if (!(error instanceof Deno.errors.NotFound)) {
      throw error;
    }
  }
}
