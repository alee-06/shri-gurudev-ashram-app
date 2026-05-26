import React, { useEffect } from 'react';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import AppButton from '../../components/AppButton';
import AppCard from '../../components/AppCard';
import AppHeader from '../../components/AppHeader';
import AppInput from '../../components/AppInput';
import ScreenContainer from '../../components/ScreenContainer';
import { theme } from '../../constants/theme';
import { TravelStackParamList } from '../../navigators/TravelStackNavigator';
import { useBookingDraftStore } from '../../store/useBookingDraftStore';

type BookingRoute = RouteProp<TravelStackParamList, 'BookingForm'>;
type BookingNav = NativeStackNavigationProp<TravelStackParamList, 'BookingForm'>;

export default function BookingFormScreen() {
  const route = useRoute<BookingRoute>();
  const navigation = useNavigation<BookingNav>();
  const packageItem = route.params.packageItem;
  const selectedPackage = useBookingDraftStore((state) => state.selectedPackage);
  const fullName = useBookingDraftStore((state) => state.fullName);
  const phoneNumber = useBookingDraftStore((state) => state.phoneNumber);
  const age = useBookingDraftStore((state) => state.age);
  const gender = useBookingDraftStore((state) => state.gender);
  const numberOfTravelers = useBookingDraftStore((state) => state.numberOfTravelers);
  const specialNotes = useBookingDraftStore((state) => state.specialNotes);
  const updateField = useBookingDraftStore((state) => state.updateField);
  const setSelectedPackage = useBookingDraftStore((state) => state.setSelectedPackage);

  useEffect(() => {
    if (!selectedPackage || selectedPackage.id !== packageItem.id) {
      setSelectedPackage(packageItem);
    }
  }, [packageItem, selectedPackage, setSelectedPackage]);

  const handleContinue = () => {
    const activePackage = selectedPackage ?? packageItem;

    navigation.navigate('Payment', {
      packageName: activePackage.title,
      totalAmount: activePackage.price,
    });
  };

  return (
    <ScreenContainer>
      <View style={styles.content}>
        <AppHeader title="Booking Form" subtitle={`Selected package: ${packageItem.title}`} />

        <AppCard>
          <AppInput label="Full Name" value={fullName} onChangeText={(text) => updateField('fullName', text)} placeholder="Enter full name" />
          <AppInput label="Phone Number" value={phoneNumber} onChangeText={(text) => updateField('phoneNumber', text)} placeholder="Enter phone number" keyboardType="phone-pad" />

          <View style={styles.row}>
            <View style={styles.flexItem}>
              <AppInput label="Age" value={age} onChangeText={(text) => updateField('age', text)} placeholder="Age" keyboardType="numeric" />
            </View>
            <View style={styles.flexItem}>
              <AppInput label="Number of Travelers" value={numberOfTravelers} onChangeText={(text) => updateField('numberOfTravelers', text)} placeholder="Count" keyboardType="numeric" />
            </View>
          </View>

          <View style={styles.genderGroup}>
            <Text style={styles.label}>Gender</Text>
            <View style={styles.genderRow}>
              {['Male', 'Female', 'Other'].map((option) => {
                const selected = gender === option;

                return (
                  <Pressable key={option} onPress={() => updateField('gender', option)} style={[styles.genderChip, selected && styles.genderChipSelected]}>
                    <Text style={[styles.genderText, selected && styles.genderTextSelected]}>{option}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <AppInput
            label="Special Notes"
            value={specialNotes}
            onChangeText={(text) => updateField('specialNotes', text)}
            placeholder="Add allergies, requests, or notes"
            multiline
            textAlignVertical="top"
            style={styles.textArea}
          />
        </AppCard>

        <AppButton title="Continue to Payment" onPress={handleContinue} />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    padding: theme.spacing.lg,
  },
  row: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  flexItem: {
    flex: 1,
  },
  genderGroup: {
    marginBottom: theme.spacing.md,
  },
  label: {
    marginBottom: theme.spacing.xs,
    color: theme.colors.text,
    fontSize: theme.typography.sizes.xs,
    fontWeight: theme.typography.weights.semibold,
  },
  genderRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  genderChip: {
    flex: 1,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.colors.borderStrong,
    backgroundColor: theme.colors.surfaceMuted,
    paddingVertical: theme.spacing.md,
    alignItems: 'center',
  },
  genderChipSelected: {
    backgroundColor: theme.colors.primarySoft,
    borderColor: theme.colors.primary,
  },
  genderText: {
    color: theme.colors.text,
    fontSize: theme.typography.sizes.xs,
    fontWeight: theme.typography.weights.semibold,
  },
  genderTextSelected: {
    color: theme.colors.primary,
  },
  textArea: {
    minHeight: 110,
    paddingTop: theme.spacing.md,
  },
});
