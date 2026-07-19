import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { VenueCategory, PriceRange } from '../types';
import { VENUE_CATEGORIES } from '../constants/categories';
import { PRICE_RANGES } from '../constants/priceRanges';
import { Button } from './Button';
import { COLORS, SPACING, FONT_SIZES, FONT_WEIGHTS, BORDER_RADIUS, SHADOWS } from '../constants/theme';

interface FilterBarProps {
  selectedCategories: VenueCategory[];
  selectedPriceRanges: PriceRange[];
  showOffersOnly?: boolean;
  onCategoryToggle: (category: VenueCategory) => void;
  onPriceRangeToggle: (priceRange: PriceRange) => void;
  onToggleOffersOnly?: () => void;
  onClearAll: () => void;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  selectedCategories,
  selectedPriceRanges,
  showOffersOnly = false,
  onCategoryToggle,
  onPriceRangeToggle,
  onToggleOffersOnly,
  onClearAll,
}) => {
  const [showPriceModal, setShowPriceModal] = useState(false);

  const hasActiveFilters = selectedCategories.length > 0 || selectedPriceRanges.length > 0 || showOffersOnly;

  return (
    <View style={styles.container}>
      {/* Category Filters */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Clear All Button */}
        {hasActiveFilters && (
          <TouchableOpacity style={styles.clearButton} onPress={onClearAll}>
            <Text style={styles.clearButtonText}>✕ Clear</Text>
          </TouchableOpacity>
        )}

        {/* All Categories */}
        <TouchableOpacity
          style={[
            styles.filterChip,
            selectedCategories.length === 0 && styles.filterChipActive,
          ]}
          onPress={() => {
            if (selectedCategories.length > 0) {
              onClearAll();
            }
          }}
        >
          <Text style={styles.chipIcon}>🌈</Text>
          <Text
            style={[
              styles.chipText,
              selectedCategories.length === 0 && styles.chipTextActive,
            ]}
          >
            All
          </Text>
        </TouchableOpacity>

        {/* Category Chips */}
        {VENUE_CATEGORIES.map((category) => {
          const isSelected = selectedCategories.includes(category.id);
          return (
            <TouchableOpacity
              key={category.id}
              style={[styles.filterChip, isSelected && styles.filterChipActive]}
              onPress={() => onCategoryToggle(category.id)}
            >
              <Text style={styles.chipIcon}>{category.icon}</Text>
              <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>
                {category.label}
              </Text>
            </TouchableOpacity>
          );
        })}

        {/* Offers Only Filter */}
        {onToggleOffersOnly && (
          <TouchableOpacity
            style={[
              styles.filterChip,
              showOffersOnly && styles.filterChipActive,
            ]}
            onPress={onToggleOffersOnly}
          >
            <Text style={styles.chipIcon}>🎁</Text>
            <Text style={[styles.chipText, showOffersOnly && styles.chipTextActive]}>
              With Offers
            </Text>
          </TouchableOpacity>
        )}

        {/* Price Filter Button */}
        <TouchableOpacity
          style={[
            styles.filterChip,
            selectedPriceRanges.length > 0 && styles.filterChipActive,
          ]}
          onPress={() => setShowPriceModal(true)}
        >
          <Text style={styles.chipIcon}>💰</Text>
          <Text
            style={[
              styles.chipText,
              selectedPriceRanges.length > 0 && styles.chipTextActive,
            ]}
          >
            Price
            {selectedPriceRanges.length > 0 && ` (${selectedPriceRanges.length})`}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Price Range Modal */}
      <Modal
        visible={showPriceModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPriceModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowPriceModal(false)}
        >
          <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Price Range</Text>
              <TouchableOpacity onPress={() => setShowPriceModal(false)}>
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.priceOptions}>
              {PRICE_RANGES.map((range) => {
                const isSelected = selectedPriceRanges.includes(range.value);
                return (
                  <TouchableOpacity
                    key={range.value}
                    style={[styles.priceOption, isSelected && styles.priceOptionActive]}
                    onPress={() => onPriceRangeToggle(range.value)}
                  >
                    <View style={styles.priceOptionContent}>
                      <Text style={styles.priceSymbol}>{range.symbol}</Text>
                      <View style={styles.priceInfo}>
                        <Text
                          style={[
                            styles.priceLabel,
                            isSelected && styles.priceLabelActive,
                          ]}
                        >
                          {range.label}
                        </Text>
                        <Text style={styles.priceDescription}>{range.description}</Text>
                      </View>
                    </View>
                    {isSelected && <Text style={styles.checkmark}>✓</Text>}
                  </TouchableOpacity>
                );
              })}
            </View>

            <Button
              title="Apply"
              onPress={() => setShowPriceModal(false)}
              fullWidth
              style={styles.applyButton}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  scrollContent: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    gap: SPACING.sm,
  },
  clearButton: {
    backgroundColor: COLORS.error + '15',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.full,
    marginRight: SPACING.xs,
  },
  clearButtonText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.error,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceVariant,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.full,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  filterChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primaryDark,
  },
  chipIcon: {
    fontSize: 18,
    marginRight: SPACING.xs,
  },
  chipText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.text,
  },
  chipTextActive: {
    color: COLORS.textInverse,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: BORDER_RADIUS.xl,
    borderTopRightRadius: BORDER_RADIUS.xl,
    padding: SPACING.lg,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  modalTitle: {
    fontSize: FONT_SIZES.xl,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.text,
  },
  closeButton: {
    fontSize: FONT_SIZES.xxl,
    color: COLORS.textSecondary,
    padding: SPACING.xs,
  },
  priceOptions: {
    marginBottom: SPACING.lg,
  },
  priceOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 2,
    borderColor: COLORS.border,
    marginBottom: SPACING.sm,
  },
  priceOptionActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryLight,
  },
  priceOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  priceSymbol: {
    fontSize: FONT_SIZES.xxl,
    marginRight: SPACING.md,
  },
  priceInfo: {
    flex: 1,
  },
  priceLabel: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  priceLabelActive: {
    color: COLORS.primary,
  },
  priceDescription: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  checkmark: {
    fontSize: FONT_SIZES.xl,
    color: COLORS.primary,
    marginLeft: SPACING.sm,
  },
  applyButton: {
    marginTop: SPACING.md,
  },
});
