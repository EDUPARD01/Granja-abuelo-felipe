const carrusel = document.getElementById("carrusel");
let angulo = 0;
let autoRotar = true;

function rotarCarrusel() {
  if (autoRotar) {
    angulo += 0.2;
    carrusel.style.transform = `rotateY(${angulo}deg)`;
  }
  requestAnimationFrame(rotarCarrusel);
}

rotarCarrusel();

// Cuando pasas el cursor sobre una imagen
document.querySelectorAll(".carrusel img").forEach((img, index) => {
  img.addEventListener("mouseenter", () => {
    autoRotar = false;
    angulo = index * -72; // apunta hacia la imagen
    carrusel.style.transform = `rotateY(${angulo}deg)`;
  });

  img.addEventListener("mouseleave", () => {
    autoRotar = true;
  });
});
