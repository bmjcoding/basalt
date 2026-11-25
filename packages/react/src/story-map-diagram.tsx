import * as React from "react";

import { DiagramFigure } from "./diagram-figure";
import type { DiagramFigureProps } from "./diagram-figure";
import { storyMapType } from "./diagram-matrix";
import type { StoryActivity, StoryCard, StoryCut, StoryMapLabels, StorySlice } from "./diagram-matrix";

export type { StoryActivity, StoryCard, StoryCut, StoryMapLabels, StorySlice } from "./diagram-matrix";
export type { DiagramAction, DiagramActionContext, DiagramFigureProps, DiagramLayoutInfo } from "./diagram-figure";

export interface StoryMapDiagramProps extends DiagramFigureProps {
  /** Who the map is for, under the source. */
  persona?: string;
  /** The backbone, in the order the story is told, each with its steps. */
  activities: StoryActivity[];
  /** The slices, from the first to ship. */
  slices: StorySlice[];
  /** The stories, each under an activity in a slice. */
  stories: StoryCard[];
  /** The one release cut: a 2px rule after the slice it names, with its words (required where it is drawn). */
  cut?: StoryCut;
  /** The built-in words, for an app that writes another language. */
  labels?: StoryMapLabels;
}

/**
 * A story map (DECISIONS 359): a backbone of activities (a contour, never inverted) with their steps, slices down, and one release cut. An activity with no
 * story in a slice has an empty slot, "No stories". The implementation has not been reviewed.
 */
export function StoryMapDiagram({ persona, activities, slices, stories, cut, labels, motion: _motion, entrance: _entrance, title, heading, legend, ...props }: StoryMapDiagramProps) {
  const spec = React.useMemo(() => ({ type: "story-map" as const, ext: storyMapType(), title, heading, legend, persona, activities, slices, stories, cut, labels }), [title, heading, legend, persona, activities, slices, stories, cut, labels]);
  return <DiagramFigure {...props} title={title} heading={heading} legend={legend} spec={spec} component="StoryMapDiagram" />;
}
