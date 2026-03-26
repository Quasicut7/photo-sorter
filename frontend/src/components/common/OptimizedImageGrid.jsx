import { memo, useMemo } from 'react';
import { useVirtualScroll } from '../hooks/useOptimization';
import LazyImage from './LazyImage';

const VirtualGrid = memo(({
  items,
  renderItem,
  itemHeight = 200,
  containerHeight = 600,
  columns = 4,
  gap = 16,
  className = ''
}) => {
  // Create rows from items
  const rows = useMemo(() => {
    const result = [];
    for (let i = 0; i < items.length; i += columns) {
      result.push(items.slice(i, i + columns));
    }
    return result;
  }, [items, columns]);

  const {
    visibleItems: visibleRows,
    totalHeight,
    offsetY,
    handleScroll,
  } = useVirtualScroll({
    items: rows,
    itemHeight,
    containerHeight,
    overscan: 2,
  });

  return (
    <div
      className={`overflow-auto ${className}`}
      style={{ height: containerHeight }}
      onScroll={handleScroll}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div
          style={{
            transform: `translateY(${offsetY}px)`,
            display: 'grid',
            gridTemplateColumns: `repeat(${columns}, 1fr)`,
            gap: `${gap}px`,
          }}
        >
          {visibleRows.map((row, rowIndex) =>
            row.map((item, itemIndex) =>
              renderItem(item, rowIndex * columns + itemIndex)
            )
          )}
        </div>
      </div>
    </div>
  );
});

VirtualGrid.displayName = 'VirtualGrid';

const OptimizedImageGrid = memo(({
  images,
  onImageClick,
  onImageDelete,
  showActions = false,
  virtualScrolling = false,
  containerHeight = 600,
  columns = 6,
}) => {
  const renderImageItem = (image, index) => (
    <div key={image._id || index} className="relative group">
      <div className="aspect-square rounded-lg overflow-hidden bg-gray-100">
        <LazyImage
          src={image.thumbnailUrls?.medium || image.originalUrl}
          alt={image.fileName || `Image ${index + 1}`}
          className="w-full h-full object-cover cursor-pointer group-hover:scale-105 transition-transform"
          onClick={() => onImageClick?.(image)}
          placeholder={
            <div className="w-full h-full bg-gray-200 animate-pulse flex items-center justify-center">
              <span className="text-gray-400 text-xs">Loading...</span>
            </div>
          }
          fallback={
            <div className="w-full h-full bg-gray-100 flex items-center justify-center">
              <span className="text-gray-400 text-xs">Failed to load</span>
            </div>
          }
        />

        {/* Actions overlay */}
        {showActions && onImageDelete && (
          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-200 flex items-center justify-center">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onImageDelete(image._id);
              }}
              className="opacity-0 group-hover:opacity-100 p-2 bg-white text-red-600 rounded-full hover:bg-red-50 transition-colors"
              title="Delete image"
            >
              🗑️
            </button>
          </div>
        )}
      </div>

      {/* Image info */}
      {image.fileName && (
        <div className="mt-2 text-sm text-gray-600">
          <p className="font-medium truncate">{image.fileName}</p>
          {image.faceCount !== undefined && (
            <p className="text-xs text-gray-500">
              {image.faceCount} face{image.faceCount !== 1 ? 's' : ''}
            </p>
          )}
        </div>
      )}
    </div>
  );

  if (virtualScrolling && images.length > 50) {
    return (
      <VirtualGrid
        items={images}
        renderItem={renderImageItem}
        containerHeight={containerHeight}
        columns={columns}
        itemHeight={220}
        className="rounded-lg"
      />
    );
  }

  return (
    <div className={`grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-${columns} gap-4`}>
      {images.map((image, index) => renderImageItem(image, index))}
    </div>
  );
});

OptimizedImageGrid.displayName = 'OptimizedImageGrid';

export default OptimizedImageGrid;