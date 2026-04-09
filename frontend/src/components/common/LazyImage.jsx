import { useState } from 'react';
import { useIntersectionObserver } from '../../hooks/useOptimization';

function LazyImage({
  src,
  alt,
  className,
  placeholder,
  fallback,
  onLoad,
  onError,
  ...props
}) {
  const [imageRef, isIntersecting] = useIntersectionObserver();
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  const handleLoad = (e) => {
    setIsLoaded(true);
    onLoad?.(e);
  };

  const handleError = (e) => {
    setHasError(true);
    onError?.(e);
  };

  return (
    <div ref={imageRef} className={`relative ${className}`} {...props}>
      {isIntersecting && !hasError && (
        <img
          src={src}
          alt={alt}
          className={`transition-opacity duration-300 ${
            isLoaded ? 'opacity-100' : 'opacity-0'
          } ${className}`}
          onLoad={handleLoad}
          onError={handleError}
          loading="lazy"
        />
      )}

      {/* Placeholder while loading */}
      {(!isIntersecting || !isLoaded) && !hasError && placeholder && (
        <div className={`absolute inset-0 flex items-center justify-center bg-gray-100 ${className}`}>
          {placeholder}
        </div>
      )}

      {/* Fallback for errors */}
      {hasError && fallback && (
        <div className={`absolute inset-0 flex items-center justify-center bg-gray-100 ${className}`}>
          {fallback}
        </div>
      )}

      {/* Loading skeleton */}
      {(!isIntersecting || (!isLoaded && !hasError)) && !placeholder && (
        <div className={`absolute inset-0 bg-gray-200 animate-pulse ${className}`} />
      )}
    </div>
  );
}

export default LazyImage;