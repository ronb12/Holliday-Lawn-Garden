const sharp = require('sharp'),
  fs = require('fs'),
  path = require('path');
class ImageOptimizer {
  constructor() {
    (this.imageDir = 'assets/images'), (this.quality = 80), (this.maxWidth = 1920);
  }
  async optimizeImages() {
    const t = this.findImages();
    for (const i of t)
      try {
        await this.optimizeImage(i), await this.createWebP(i);
      } catch (t) {}
  }
  findImages() {
    return this.findFiles(this.imageDir, ['.jpg', '.jpeg', '.png']);
  }
  async optimizeImage(t) {
    const i = sharp(t);
    (await i.metadata()).width > this.maxWidth &&
      i.resize(this.maxWidth, null, { fit: 'inside', withoutEnlargement: !0 }),
      t.endsWith('.jpg') || t.endsWith('.jpeg')
        ? await i.jpeg({ quality: this.quality, progressive: !0 }).toFile(this.getOptimizedPath(t))
        : t.endsWith('.png') &&
          (await i
            .png({ quality: this.quality, compressionLevel: 9 })
            .toFile(this.getOptimizedPath(t)));
  }
  async createWebP(t) {
    const i = this.getWebPPath(t);
    await sharp(t).webp({ quality: this.quality }).toFile(i);
  }
  getOptimizedPath(t) {
    const i = path.dirname(t),
      e = path.extname(t),
      a = path.basename(t, e);
    return path.join(i, `${a}.optimized${e}`);
  }
  getWebPPath(t) {
    const i = path.dirname(t),
      e = path.basename(t, path.extname(t));
    return path.join(i, `${e}.webp`);
  }
  findFiles(t, i) {
    let e = [];
    const a = fs.readdirSync(t);
    for (const s of a) {
      const a = path.join(t, s);
      fs.statSync(a).isDirectory()
        ? (e = e.concat(this.findFiles(a, i)))
        : i.some(t => s.toLowerCase().endsWith(t)) && e.push(a);
    }
    return e;
  }
}
const optimizer = new ImageOptimizer();
optimizer.optimizeImages();
export { ImageOptimizer };
