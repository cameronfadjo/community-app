import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { CheckInCard, LoadingSpinner, Button } from '../../src/components';
import { getSocialFeed, toggleLike, isCheckInLiked } from '../../src/services/api/checkins';
import { CheckIn } from '../../src/types';
import { useAuth } from '../../src/hooks/useAuth';
import { useRouter } from 'expo-router';
import { COLORS, SPACING, FONT_SIZES, FONT_WEIGHTS } from '../../src/constants/theme';

type FeedFilter = 'all' | 'recent' | 'popular';

export default function SocialScreen() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();

  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [likedCheckIns, setLikedCheckIns] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<FeedFilter>('recent');

  useEffect(() => {
    loadFeed();
  }, []);

  const loadFeed = async () => {
    setLoading(true);
    try {
      const feed = await getSocialFeed();
      setCheckIns(feed);

      // Load liked status for authenticated users
      if (isAuthenticated) {
        const liked = new Set<string>();
        for (const checkIn of feed) {
          const isLiked = await isCheckInLiked(checkIn.id);
          if (isLiked) {
            liked.add(checkIn.id);
          }
        }
        setLikedCheckIns(liked);
      }
    } catch (error) {
      console.error('Error loading feed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadFeed();
    setRefreshing(false);
  };

  const handleLike = async (checkInId: string) => {
    if (!isAuthenticated) {
      Alert.alert('Sign In Required', 'Please sign in to like check-ins.');
      return;
    }

    const isCurrentlyLiked = likedCheckIns.has(checkInId);

    // Optimistic update
    const newLikedCheckIns = new Set(likedCheckIns);
    if (isCurrentlyLiked) {
      newLikedCheckIns.delete(checkInId);
    } else {
      newLikedCheckIns.add(checkInId);
    }
    setLikedCheckIns(newLikedCheckIns);

    // Update check-in likes count locally
    setCheckIns(prevCheckIns =>
      prevCheckIns.map(checkIn =>
        checkIn.id === checkInId
          ? { ...checkIn, likes: checkIn.likes + (isCurrentlyLiked ? -1 : 1) }
          : checkIn
      )
    );

    try {
      await toggleLike(checkInId, isCurrentlyLiked);
    } catch (error) {
      console.error('Error toggling like:', error);
      // Revert on error
      setLikedCheckIns(likedCheckIns);
    }
  };

  const getFilteredCheckIns = () => {
    const sorted = [...checkIns];

    switch (filter) {
      case 'popular':
        return sorted.sort((a, b) => b.likes - a.likes);
      case 'recent':
      default:
        return sorted; // Already sorted by createdAt desc from query
    }
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <Text style={styles.title}>Community Feed</Text>
      <Text style={styles.subtitle}>
        See what the community is experiencing
      </Text>

      {/* Filter Tabs */}
      <View style={styles.filterTabs}>
        <TouchableOpacity
          style={[styles.filterTab, filter === 'recent' && styles.filterTabActive]}
          onPress={() => setFilter('recent')}
        >
          <Text
            style={[
              styles.filterTabText,
              filter === 'recent' && styles.filterTabTextActive,
            ]}
          >
            Recent
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterTab, filter === 'popular' && styles.filterTabActive]}
          onPress={() => setFilter('popular')}
        >
          <Text
            style={[
              styles.filterTabText,
              filter === 'popular' && styles.filterTabTextActive,
            ]}
          >
            Popular
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyIcon}>📸</Text>
      <Text style={styles.emptyTitle}>No check-ins yet</Text>
      <Text style={styles.emptyText}>
        Be the first to share your experience! Check in at a venue to get started.
      </Text>
      <Button
        title="Explore Venues"
        onPress={() => router.push('/(tabs)/explore')}
        style={styles.exploreButton}
      />
    </View>
  );

  if (loading) {
    return <LoadingSpinner fullScreen message="Loading community feed..." />;
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={getFilteredCheckIns()}
        renderItem={({ item }) => (
          <CheckInCard
            checkIn={item}
            onLike={() => handleLike(item.id)}
            isLiked={likedCheckIns.has(item.id)}
          />
        )}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        refreshing={refreshing}
        onRefresh={handleRefresh}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  listContent: {
    padding: SPACING.lg,
  },
  header: {
    marginBottom: SPACING.lg,
  },
  title: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  subtitle: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    marginBottom: SPACING.md,
  },
  filterTabs: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  filterTab: {
    flex: 1,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: SPACING.md,
    backgroundColor: COLORS.surfaceVariant,
    alignItems: 'center',
  },
  filterTabActive: {
    backgroundColor: COLORS.primary,
  },
  filterTabText: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.text,
  },
  filterTabTextActive: {
    color: COLORS.textInverse,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: SPACING.xxl * 2,
    paddingHorizontal: SPACING.lg,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: SPACING.lg,
  },
  emptyTitle: {
    fontSize: FONT_SIZES.xl,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  emptyText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.xl,
    lineHeight: 22,
  },
  exploreButton: {
    minWidth: 200,
  },
});
