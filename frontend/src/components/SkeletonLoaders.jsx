import React from 'react';

/**
 * Skeleton loader for match cards
 * Shows placeholder while real data loads
 */
export const MatchCardSkeleton = () => {
  return (
    <div className="bg-[#2E004F]/30 border border-[#2E004F]/50 rounded-xl p-4 animate-pulse">
      {/* Header skeleton */}
      <div className="flex items-center justify-between mb-4">
        <div className="h-4 bg-gray-700/50 rounded w-32"></div>
        <div className="h-6 bg-gray-700/50 rounded w-16"></div>
      </div>
      
      {/* Teams skeleton */}
      <div className="grid grid-cols-3 gap-4 items-center mb-4">
        {/* Home team */}
        <div className="text-center">
          <div className="w-10 h-10 bg-gray-700/50 rounded-full mx-auto mb-2"></div>
          <div className="h-4 bg-gray-700/50 rounded w-20 mx-auto"></div>
        </div>
        
        {/* VS */}
        <div className="text-center">
          <div className="h-6 bg-gray-700/50 rounded w-12 mx-auto"></div>
        </div>
        
        {/* Away team */}
        <div className="text-center">
          <div className="w-10 h-10 bg-gray-700/50 rounded-full mx-auto mb-2"></div>
          <div className="h-4 bg-gray-700/50 rounded w-20 mx-auto"></div>
        </div>
      </div>
      
      {/* Odds skeleton */}
      <div className="grid grid-cols-3 gap-2">
        <div className="h-12 bg-gray-700/50 rounded"></div>
        <div className="h-12 bg-gray-700/50 rounded"></div>
        <div className="h-12 bg-gray-700/50 rounded"></div>
      </div>
    </div>
  );
};

/**
 * Skeleton loader for prediction cards
 */
export const PredictionCardSkeleton = () => {
  return (
    <div className="bg-gradient-to-br from-purple-900/30 to-indigo-900/30 border border-[#2E004F]/50 rounded-xl p-4 sm:p-6 animate-pulse">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <div className="w-6 h-6 bg-gray-700/50 rounded-full"></div>
        <div className="h-5 bg-gray-700/50 rounded w-32"></div>
      </div>
      
      {/* Teams */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="h-16 bg-gray-700/50 rounded"></div>
        <div className="h-16 bg-gray-700/50 rounded"></div>
        <div className="h-16 bg-gray-700/50 rounded"></div>
      </div>
      
      {/* Prediction */}
      <div className="h-24 bg-gray-700/50 rounded mb-4"></div>
      
      {/* Stats */}
      <div className="grid grid-cols-3 gap-2">
        <div className="h-12 bg-gray-700/50 rounded"></div>
        <div className="h-12 bg-gray-700/50 rounded"></div>
        <div className="h-12 bg-gray-700/50 rounded"></div>
      </div>
    </div>
  );
};

/**
 * Skeleton loader for list items
 */
export const ListItemSkeleton = () => {
  return (
    <div className="flex items-center gap-4 p-4 bg-[#2E004F]/20 rounded-lg animate-pulse">
      <div className="w-12 h-12 bg-gray-700/50 rounded-full flex-shrink-0"></div>
      <div className="flex-1 space-y-2">
        <div className="h-4 bg-gray-700/50 rounded w-3/4"></div>
        <div className="h-3 bg-gray-700/50 rounded w-1/2"></div>
      </div>
      <div className="w-16 h-8 bg-gray-700/50 rounded"></div>
    </div>
  );
};

/**
 * Skeleton loader for stat cards
 */
export const StatCardSkeleton = () => {
  return (
    <div className="bg-[#2E004F]/30 border border-[#2E004F]/50 rounded-xl p-6 animate-pulse">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 bg-gray-700/50 rounded-full"></div>
        <div className="h-5 bg-gray-700/50 rounded w-32"></div>
      </div>
      <div className="h-10 bg-gray-700/50 rounded w-24 mb-2"></div>
      <div className="h-3 bg-gray-700/50 rounded w-full"></div>
    </div>
  );
};

/**
 * Multiple skeleton loaders
 */
export const MatchCardSkeletonList = ({ count = 3 }) => {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, index) => (
        <MatchCardSkeleton key={index} />
      ))}
    </div>
  );
};

export const PredictionCardSkeletonList = ({ count = 3 }) => {
  return (
    <div className="grid gap-4 sm:gap-6">
      {Array.from({ length: count }).map((_, index) => (
        <PredictionCardSkeleton key={index} />
      ))}
    </div>
  );
};

export default {
  MatchCardSkeleton,
  PredictionCardSkeleton,
  ListItemSkeleton,
  StatCardSkeleton,
  MatchCardSkeletonList,
  PredictionCardSkeletonList
};
