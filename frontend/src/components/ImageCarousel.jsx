import { useState } from "react";

const ImageCarousel = ({ images = [] }) => {
  const [index, setIndex] = useState(0);

  if (!images.length) {
    return <div className="loading">No images available</div>;
  }

  const goPrev = () => {
    setIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const goNext = () => {
    setIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  };

  return (
    <div className="carousel">
      <div className="carousel__image">
        <img src={images[index]} alt={`Sneaker image ${index + 1}`} />
        <button
          type="button"
          onClick={goPrev}
          className="carousel__button carousel__button--prev"
        >
          Prev
        </button>
        <button
          type="button"
          onClick={goNext}
          className="carousel__button carousel__button--next"
        >
          Next
        </button>
      </div>
      <div className="carousel__thumbs">
        {images.map((image, imageIndex) => (
          <button
            key={`${image}-${imageIndex}`}
            type="button"
            onClick={() => setIndex(imageIndex)}
            className={`carousel__thumb ${
              imageIndex === index ? "is-active" : ""
            }`}
          >
            <img src={image} alt={`Thumbnail ${imageIndex + 1}`} />
          </button>
        ))}
      </div>
    </div>
  );
};

export default ImageCarousel;
