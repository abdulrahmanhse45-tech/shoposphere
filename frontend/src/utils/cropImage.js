// Crops a picture to the square the admin selected, then shrinks it so it is
// at most 800x800 pixels, and returns it as a JPEG file (a Blob).
// This all happens in the browser, BEFORE anything is uploaded.
export const getCroppedBlob = (imageSrc, pixelCrop, maxSize = 800) =>
  new Promise((resolve, reject) => {
    const image = new Image();

    image.onload = () => {
      // Never make the picture bigger than the part that was selected.
      const size = Math.max(1, Math.min(maxSize, Math.round(pixelCrop.width)));
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;

      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#FFFFFF"; // so transparent PNGs don't turn black as JPEG
      ctx.fillRect(0, 0, size, size);
      ctx.drawImage(
        image,
        pixelCrop.x,
        pixelCrop.y,
        pixelCrop.width,
        pixelCrop.height,
        0,
        0,
        size,
        size
      );

      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error("Could not crop the image"))),
        "image/jpeg",
        0.9
      );
    };

    image.onerror = () => reject(new Error("Could not read the image"));
    image.src = imageSrc;
  });
