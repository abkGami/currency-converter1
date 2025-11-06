import React, { useEffect, useMemo, useState } from "react";
import { StatusBar } from "expo-status-bar";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

type SymbolsResponse = {
  success: boolean;
  symbols: Record<
    string,
    {
      description: string;
      code: string;
    }
  >;
};

export default function App() {
  const [symbols, setSymbols] = useState<Record<string, string>>({});
  const [loadingSymbols, setLoadingSymbols] = useState(true);
  const [amount, setAmount] = useState("1");
  const [fromCurrency, setFromCurrency] = useState("USD");
  const [toCurrency, setToCurrency] = useState("NGN");
  const [result, setResult] = useState<number | null>(null);
  const [rate, setRate] = useState<number | null>(null);
  const [loadingConversion, setLoadingConversion] = useState(false);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerTarget, setPickerTarget] = useState<"from" | "to">("from");
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch available currency symbols from exchangerate-api.com (free, no key required)
  useEffect(() => {
    let mounted = true;
    const fetchSymbols = async () => {
      try {
        setLoadingSymbols(true);
        const res = await fetch("https://open.er-api.com/v6/latest/USD");
        const data = await res.json();
        if (!mounted) return;
        if (data && data.result === "success" && data.rates) {
          // exchangerate-api only gives us currency codes, so we'll create a basic map
          const map: Record<string, string> = {};
          Object.keys(data.rates).forEach((code) => {
            map[code] = code; // Use code as description for now
          });
          setSymbols(map);
          // ensure defaults exist
          if (!map["NGN"]) setToCurrency(Object.keys(map)[0] ?? "NGN");
        } else {
          Alert.alert("Failed to load currency list");
        }
      } catch (e) {
        Alert.alert("Error", "Unable to fetch currency list.");
      } finally {
        setLoadingSymbols(false);
      }
    };
    fetchSymbols();
    return () => {
      mounted = false;
    };
  }, []);

  const currencyList = useMemo(() => Object.keys(symbols).sort(), [symbols]);

  const filteredCurrencyList = useMemo(() => {
    if (!searchQuery.trim()) return currencyList;
    const query = searchQuery.toLowerCase();
    return currencyList.filter(
      (code) =>
        code.toLowerCase().includes(query) ||
        symbols[code]?.toLowerCase().includes(query)
    );
  }, [currencyList, searchQuery, symbols]);

  const openPicker = (target: "from" | "to") => {
    setPickerTarget(target);
    setPickerVisible(true);
    setSearchQuery(""); // Reset search when opening picker
  };

  const doConvert = async () => {
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt < 0) {
      Alert.alert("Invalid amount", "Please enter a valid positive number");
      return;
    }
    try {
      setLoadingConversion(true);
      // Use exchangerate-api.com pair endpoint (free, no key required)
      const q = `https://open.er-api.com/v6/latest/${encodeURIComponent(
        fromCurrency
      )}`;
      const res = await fetch(q);
      const data = await res.json();
      // data looks like: { result: 'success', rates: { ... } }
      if (
        data &&
        data.result === "success" &&
        data.rates &&
        data.rates[toCurrency]
      ) {
        const rate = data.rates[toCurrency];
        setRate(rate);
        setResult(amt * rate);
      } else {
        Alert.alert("Conversion failed", "Could not fetch conversion rate.");
      }
    } catch (e) {
      Alert.alert("Error", "Unable to perform conversion.");
    } finally {
      setLoadingConversion(false);
    }
  };

  useEffect(() => {
    // run conversion whenever currencies change or amount is empty? We'll not auto-run on every key stroke to avoid rate limits.
    // User presses Convert below.
  }, [fromCurrency, toCurrency]);

  const swapCurrencies = () => {
    setFromCurrency((prevFrom) => {
      setToCurrency(prevFrom);
      return toCurrency;
    });
    setResult(null);
    setRate(null);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <Text style={styles.title}>Currency Converter</Text>
        <Text style={styles.subtitle}>
          Convert any currency to Naira and back
        </Text>
      </View>

      <View style={styles.card}>
        {loadingSymbols ? (
          <View style={styles.centerRow}>
            <ActivityIndicator size="large" color="#5B21B6" />
            <Text style={styles.loadingText}>Loading currencies...</Text>
          </View>
        ) : (
          <>
            <View style={styles.row}>
              <View style={styles.inputColumn}>
                <Text style={styles.label}>Amount</Text>
                <TextInput
                  keyboardType="numeric"
                  value={amount}
                  onChangeText={setAmount}
                  placeholder="0.00"
                  placeholderTextColor="#888"
                  style={styles.input}
                />
              </View>

              <View style={styles.pickerColumn}>
                <Text style={styles.label}>From</Text>
                <TouchableOpacity
                  onPress={() => openPicker("from")}
                  style={styles.pickerButton}
                >
                  <Text style={styles.pickerText}>{fromCurrency}</Text>
                  <Text style={styles.pickerSub}>{symbols[fromCurrency]}</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={[styles.row, { marginTop: 14 }]}>
              <View style={styles.pickerColumn}>
                <Text style={styles.label}>To</Text>
                <TouchableOpacity
                  onPress={() => openPicker("to")}
                  style={styles.pickerButton}
                >
                  <Text style={styles.pickerText}>{toCurrency}</Text>
                  <Text style={styles.pickerSub}>{symbols[toCurrency]}</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.swapColumn}>
                <Text style={styles.label}> </Text>
                <TouchableOpacity
                  onPress={swapCurrencies}
                  style={styles.swapButton}
                >
                  <Text style={styles.swapText}>⇄ Swap</Text>
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              style={styles.convertButton}
              onPress={doConvert}
              disabled={loadingConversion}
            >
              {loadingConversion ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.convertText}>Convert</Text>
              )}
            </TouchableOpacity>

            <View style={styles.resultBlock}>
              <Text style={styles.resultLabel}>Result</Text>
              {result == null ? (
                <Text style={styles.resultValueMuted}>No conversion yet</Text>
              ) : (
                <>
                  <Text style={styles.resultValue}>
                    {parseFloat(String(result)).toLocaleString(undefined, {
                      maximumFractionDigits: 6,
                    })}{" "}
                    {toCurrency}
                  </Text>
                  {rate != null && (
                    <Text style={styles.rateText}>
                      1 {fromCurrency} = {rate} {toCurrency}
                    </Text>
                  )}
                </>
              )}
            </View>
          </>
        )}
      </View>

      {/* <View style={styles.footer}>
        <Text style={styles.footerText}>
          Powered by ExchangeRate-API.com • Free & Open
        </Text>
      </View> */}

      <Modal visible={pickerVisible} animationType="slide">
        <SafeAreaView style={styles.modalSafe}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select currency</Text>
            <TouchableOpacity onPress={() => setPickerVisible(false)}>
              <Text style={styles.modalClose}>Close</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.searchContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder="Search currency code..."
              placeholderTextColor="#666"
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="characters"
              autoCorrect={false}
            />
          </View>

          <FlatList
            data={filteredCurrencyList}
            keyExtractor={(i) => i}
            initialNumToRender={30}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.currencyRow}
                onPress={() => {
                  if (pickerTarget === "from") setFromCurrency(item);
                  else setToCurrency(item);
                  setPickerVisible(false);
                  setResult(null);
                  setRate(null);
                }}
              >
                <Text style={styles.currencyCode}>{item}</Text>
                <Text style={styles.currencyName}>{symbols[item]}</Text>
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>No currencies found</Text>
              </View>
            }
          />
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#0f172a" },
  header: { padding: 40 },
  title: { color: "#fff", fontSize: 28, fontWeight: "700" },
  subtitle: { color: "#9ca3af", marginTop: 6 },

  card: {
    marginHorizontal: 16,
    marginTop: 8,
    backgroundColor: "#0b1220",
    borderRadius: 14,
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 6,
  },

  centerRow: { alignItems: "center", justifyContent: "center", padding: 20 },
  loadingText: { marginTop: 8, color: "#c7d2fe" },

  row: { flexDirection: "row", alignItems: "center" },
  inputColumn: { flex: 1, marginRight: 12 },
  pickerColumn: { flex: 1 },
  swapColumn: { width: 84, alignItems: "center", justifyContent: "center" },

  label: { color: "#94a3b8", marginBottom: 6, fontSize: 12 },
  input: {
    backgroundColor: "#071129",
    color: "#fff",
    padding: 12,
    borderRadius: 10,
    fontSize: 16,
  },

  pickerButton: {
    backgroundColor: "#071129",
    padding: 12,
    borderRadius: 10,
  },
  pickerText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  pickerSub: { color: "#9ca3af", fontSize: 11, marginTop: 4, maxWidth: 180 },

  swapButton: {
    backgroundColor: "#111827",
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
  },
  swapText: { color: "#e0e7ff" },

  convertButton: {
    marginTop: 18,
    backgroundColor: "#7c3aed",
    padding: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  convertText: { color: "#fff", fontWeight: "700", fontSize: 16 },

  resultBlock: { marginTop: 18, padding: 12 },
  resultLabel: { color: "#94a3b8", fontSize: 12 },
  resultValueMuted: { color: "#9ca3af", marginTop: 8 },
  resultValue: { color: "#fff", fontSize: 20, fontWeight: "700", marginTop: 8 },
  rateText: { color: "#c7d2fe", marginTop: 6 },

  footer: { alignItems: "center", marginTop: 18 },
  footerText: { color: "#7c8798", fontSize: 12 },

  modalSafe: { flex: 1, backgroundColor: "#0b1220" },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 16,
  },
  modalTitle: { color: "#fff", fontSize: 18, fontWeight: "700" },
  modalClose: { color: "#c7d2fe", fontWeight: "600" },

  currencyRow: {
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#081226",
  },
  currencyCode: { color: "#fff", fontWeight: "700" },
  currencyName: { color: "#9ca3af", marginTop: 6 },

  searchContainer: { padding: 16, paddingTop: 8 },
  searchInput: {
    backgroundColor: "#071129",
    color: "#fff",
    padding: 12,
    borderRadius: 10,
    fontSize: 16,
  },

  emptyState: { padding: 40, alignItems: "center" },
  emptyText: { color: "#9ca3af", fontSize: 14 },
});
