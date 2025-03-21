import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@react-navigation/native";
import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { RFValue } from "react-native-responsive-fontsize";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { moderateScale } from "react-native-size-matters";

import CurrenciesModal from "@/components/CurrenciesModal";
import CurrencySelector from "@/components/CurrencySelector";
import CustomText from "@/components/CustomText";
import PrivacyTerms from "@/components/PrivacyTerms";
import SwapButton from "@/components/SwapButton";
import { Colors } from "@/constants/Colors";
import { Fonts } from "@/constants/Fonts";
import { getStoredValues, saveSecurely } from "@/store/storage";
import { ThemeContext } from "@/theme/CustomThemeProvider";

// Import reusable service functions
import {
  Currency,
  fetchCurrencies,
  fetchGlobalExchangeRates,
  registerBackgroundFetch,
} from "@/services/currencyService";

// Helper function to format numbers
const formatNumber = (num: number): string =>
  num.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const CurrencyConverterScreen = () => {
  const { colors } = useTheme();
  const { setTheme } = useContext(ThemeContext);
  const { top } = useSafeAreaInsets();

  // Local state
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [fromCurrency, setFromCurrency] = useState<Currency | null>(null);
  const [toCurrency, setToCurrency] = useState<Currency | null>(null);
  const [amount, setAmount] = useState<string>("");
  const [convertedAmount, setConvertedAmount] = useState<string>("");
  // Global exchange rates are stored relative to a fixed base currency.
  const [exchangeRates, setExchangeRates] = useState<Record<string, number>>(
    {}
  );
  const [isModalVisible, setIsModalVisible] = useState<boolean>(false);
  const [isSelectingFrom, setIsSelectingFrom] = useState<boolean>(true);

  // Load stored data on mount
  useEffect(() => {
    try {
      const storedData = getStoredValues([
        "currencies",
        "exchangeRates",
        "lastFromCurrency",
        "lastToCurrency",
        "lastAmount",
      ]);

      if (storedData.currencies) {
        const parsedCurrencies: Currency[] = JSON.parse(storedData.currencies);
        setCurrencies(parsedCurrencies);
        setFromCurrency(
          parsedCurrencies.find(
            (c) => c.code === storedData.lastFromCurrency
          ) ||
            parsedCurrencies.find((c) => c.code === "USD") ||
            null
        );
        setToCurrency(
          parsedCurrencies.find((c) => c.code === storedData.lastToCurrency) ||
            parsedCurrencies.find((c) => c.code === "KES") ||
            null
        );
      }

      if (storedData.exchangeRates) {
        setExchangeRates(JSON.parse(storedData.exchangeRates));
      }

      if (storedData.lastAmount) {
        setAmount(storedData.lastAmount);
      }
    } catch (error) {
      console.error("Error loading stored data:", error);
    }
  }, []);

  // Fetch currencies and exchange rates on mount if needed
  useEffect(() => {
    (async () => {
      const fetchedCurrencies = await fetchCurrencies();
      if (fetchedCurrencies) {
        setCurrencies(fetchedCurrencies);
      }
      const rates = await fetchGlobalExchangeRates();
      if (rates) {
        setExchangeRates(rates);
      }
    })();
  }, []);

  // Register background fetch to update data when app is in background
  useEffect(() => {
    registerBackgroundFetch();
    // Optionally, unregister on unmount:
    return () => {
      // unregisterBackgroundFetch(); // Uncomment if you wish to unregister when unmounting.
    };
  }, []);

  // Conversion logic: convert amount from one currency to another using global rates.
  const handleConvert = useCallback(() => {
    if (!amount || isNaN(Number(amount))) {
      Alert.alert("Invalid Input", "Please enter a valid amount.");
      return;
    }
    if (!fromCurrency || !toCurrency) {
      Alert.alert("Currency Error", "Please select both currencies.");
      return;
    }
    const fromRate = exchangeRates[fromCurrency.code];
    const toRate = exchangeRates[toCurrency.code];
    if (!fromRate || !toRate) {
      Alert.alert("Error", "Exchange rates unavailable.");
      return;
    }
    const conversionRate = toRate / fromRate;
    const rawConverted = Number(amount) * conversionRate;
    const formattedConverted = formatNumber(rawConverted);
    setConvertedAmount(formattedConverted);
    saveSecurely([
      { key: "lastAmount", value: amount },
      { key: "lastConvertedAmount", value: formattedConverted },
    ]);
  }, [amount, fromCurrency, toCurrency, exchangeRates]);

  // Auto-update conversion on dependency changes.
  useEffect(() => {
    if (
      amount &&
      fromCurrency &&
      toCurrency &&
      Object.keys(exchangeRates).length > 0
    ) {
      handleConvert();
    }
  }, [amount, fromCurrency, toCurrency, exchangeRates, handleConvert]);

  const handleCurrencySelect = useCallback(
    (currency: Currency) => {
      if (isSelectingFrom) {
        setFromCurrency(currency);
        saveSecurely([{ key: "lastFromCurrency", value: currency.code }]);
      } else {
        setToCurrency(currency);
        saveSecurely([{ key: "lastToCurrency", value: currency.code }]);
      }
      setIsModalVisible(false);
    },
    [isSelectingFrom]
  );

  const swapCurrencies = useCallback(() => {
    if (!fromCurrency || !toCurrency) return;
    const newFrom = toCurrency;
    const newTo = fromCurrency;
    setFromCurrency(newFrom);
    setToCurrency(newTo);
    saveSecurely([
      { key: "lastFromCurrency", value: newFrom.code },
      { key: "lastToCurrency", value: newTo.code },
    ]);
  }, [fromCurrency, toCurrency]);

  const convertedDisplay = useMemo(
    () => (convertedAmount ? `${convertedAmount} ${toCurrency?.code}` : ""),
    [convertedAmount, toCurrency]
  );

  const exchangeRateDisplay = useMemo(() => {
    if (fromCurrency && toCurrency) {
      const fromRate = exchangeRates[fromCurrency.code];
      const toRate = exchangeRates[toCurrency.code];
      if (fromRate && toRate) {
        const conversionRate = toRate / fromRate;
        return `1 ${fromCurrency.code} = ${conversionRate.toFixed(2)} ${
          toCurrency.code
        }`;
      }
    }
    return "";
  }, [fromCurrency, toCurrency, exchangeRates]);

  return (
    <ScrollView
      style={[
        styles.screen,
        { backgroundColor: colors.background, paddingTop: top + 10 },
      ]}
      contentContainerStyle={{ flexGrow: 1 }}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {/* Header with theme toggle */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() =>
            setTheme((prev: string) => (prev === "dark" ? "light" : "dark"))
          }
          activeOpacity={0.8}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons
            name="color-palette"
            size={RFValue(24)}
            color={Colors.primary}
          />
        </TouchableOpacity>
      </View>

      {/* Title and subtitle */}
      <View style={styles.textContainer}>
        <CustomText variant="h1" fontFamily={Fonts.Bold}>
          Currency Converter
        </CustomText>
        <CustomText
          variant="h6"
          fontFamily={Fonts.Medium}
          style={{ color: colors.gray[400] }}
        >
          Convert between any currencies
        </CustomText>
      </View>

      {/* Card with currency selectors */}
      <View style={[styles.card, { backgroundColor: colors.gray[200] }]}>
        <CurrencySelector
          label="Amount"
          onPress={() => {
            setIsSelectingFrom(true);
            setIsModalVisible(true);
          }}
          placeholder="Enter Amount"
          currency={fromCurrency}
          value={amount}
          onChangeText={setAmount}
        />

        <SwapButton onPress={swapCurrencies} />

        <CurrencySelector
          label="Converted Amount"
          placeholder="0.00"
          onPress={() => {
            setIsSelectingFrom(false);
            setIsModalVisible(true);
          }}
          currency={toCurrency}
          value={convertedDisplay}
          editable={false}
        />
      </View>

      <TouchableOpacity
        style={styles.button}
        onPress={handleConvert}
        activeOpacity={0.8}
      >
        <CustomText
          variant="h5"
          fontFamily={Fonts.Medium}
          style={{ color: Colors.white }}
        >
          Convert
        </CustomText>
      </TouchableOpacity>

      <View style={styles.exchangeRateContainer}>
        <CustomText variant="h6" style={{ color: colors.gray[400] }}>
          Indicative Exchange Rate
        </CustomText>
        {exchangeRateDisplay && (
          <CustomText variant="h5" fontFamily={Fonts.Medium}>
            {exchangeRateDisplay}
          </CustomText>
        )}
      </View>

      <PrivacyTerms />

      <CurrenciesModal
        visible={isModalVisible}
        currencies={currencies}
        onClose={() => setIsModalVisible(false)}
        onCurrenciesSelect={handleCurrencySelect}
      />
    </ScrollView>
  );
};

export default CurrencyConverterScreen;

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    paddingHorizontal: 20,
  },
  header: {
    alignSelf: "flex-end",
  },
  textContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
  },
  card: {
    paddingVertical: moderateScale(15),
    padding: 15,
    borderRadius: 15,
    marginTop: 30,
  },
  exchangeRateContainer: {
    marginTop: 30,
    gap: 10,
  },
  button: {
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    borderRadius: 15,
    marginTop: 30,
  },
});
