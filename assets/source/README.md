# Hera source model

`hera.glb` is the original file supplied for the landing page, preserved here
because Vite replaces `dist/` on every build. It is not served to visitors.
The 105 MiB source is ignored by Git; the lightweight derivative in `public/`
is the deployable asset. Keep the local source to regenerate it.

The embedded attribution identifies **Hera**, by
[noe-3d.at](https://sketchfab.com/www.noe-3d.at), licensed under
[CC BY-NC 4.0](https://creativecommons.org/licenses/by-nc/4.0/).
[Original model](https://sketchfab.com/3d-models/hera-676125fabf4f48e78ca772b72bbd4937).
The license restricts commercial use; retain attribution when redistributing.

Run `npm run prepare:hera` to regenerate `public/models/hera-points.glb`.
The derivative samples 160,000 surface points with minimum spacing, concentrated
around the upper third. It preserves normals and attribution and removes all
textures. The upper triangle surface is retained only for an invisible depth pass
that prevents rear points from showing through the face. The combined GLB is
approximately 8.2 MB. The landing renders round dots with directional lighting
and size gradients, using a fixed three-quarter bust view.
