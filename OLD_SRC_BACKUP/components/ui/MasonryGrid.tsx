import { useEffect, useRef } from "react";
import Masonry from "masonry-layout";
import imagesLoaded from "imagesloaded";
import { cn } from "@/lib/utils";

interface MasonryGridProps {
    children: React.ReactNode;
    className?: string;
    itemSelector?: string;
}

export const MasonryGrid = ({
    children,
    className,
    itemSelector = ".masonry-item",
}: MasonryGridProps) => {
    const gridRef = useRef<HTMLDivElement>(null);
    const masonryInstance = useRef<Masonry | null>(null);

    useEffect(() => {
        if (!gridRef.current) return;

        // Initialize Masonry
        masonryInstance.current = new Masonry(gridRef.current, {
            itemSelector: itemSelector,
            percentPosition: true,
            transitionDuration: '0.2s',
        });

        // Layout helper
        const performLayout = () => {
            masonryInstance.current?.layout();
        };

        // Bind imagesLoaded
        const imgLoad = imagesLoaded(gridRef.current);
        imgLoad.on('progress', performLayout);
        imgLoad.on('always', performLayout);

        // Initial layout - immediate and delayed to catch render ticks
        performLayout();
        const timer = setTimeout(performLayout, 100);

        return () => {
            clearTimeout(timer);
            imgLoad.off('progress', performLayout);
            imgLoad.off('always', performLayout);
            masonryInstance.current?.destroy();
        };
    }, []);

    // Handle children updates
    useEffect(() => {
        if (masonryInstance.current) {
            masonryInstance.current.reloadItems();
            masonryInstance.current.layout();

            // Re-bind to catch new images in updated children
            const imgLoad = imagesLoaded(gridRef.current);
            const performLayout = () => {
                masonryInstance.current?.layout();
            };

            imgLoad.on('progress', performLayout);
            imgLoad.on('always', performLayout);

            // Safer layout trigger
            const timer = setTimeout(performLayout, 100);

            return () => {
                clearTimeout(timer);
                imgLoad.off('progress', performLayout);
                imgLoad.off('always', performLayout);
            };
        }
    }, [children]);

    return (
        <div ref={gridRef} className={cn("w-full -mx-2 sm:-mx-3", className)}>
            {children}
        </div>
    );
};
