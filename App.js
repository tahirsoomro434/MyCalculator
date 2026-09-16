// App.js
import React, { useState, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  SafeAreaView,
  Animated,
  Modal,
  FlatList,
} from 'react-native';
import * as Haptics from 'expo-haptics';

export default function App() {
  const [input, setInput] = useState('0');
  const [expressionText, setExpressionText] = useState('');
  const [justEvaluated, setJustEvaluated] = useState(false);
  const [history, setHistory] = useState([]);
  const [historyVisible, setHistoryVisible] = useState(false);

  const displayScale = useRef(new Animated.Value(1)).current;

  React.useEffect(() => {
    displayScale.setValue(0.96);
    Animated.spring(displayScale, { toValue: 1, useNativeDriver: true, speed: 20, bounciness: 6 }).start();
  }, [input]);

  const clear = () => {
    setInput('0');
    setExpressionText('');
    setJustEvaluated(false);
  };

  const pressDigit = (d) => {
    if (justEvaluated) {
      setInput(String(d));
      setExpressionText('');
      setJustEvaluated(false);
      return;
    }
    setInput(input === '0' ? String(d) : input + d);
  };

  const pressDecimal = () => {
    if (justEvaluated) {
      setInput('0.');
      setExpressionText('');
      setJustEvaluated(false);
      return;
    }
    const segments = input.split(/[+\-×÷(]/);
    const currentSegment = segments[segments.length - 1];
    if (!currentSegment.includes('.')) {
      setInput(input + '.');
    }
  };

  const pressOperator = (op) => {
    if (justEvaluated) {
      setInput(input + op);
      setJustEvaluated(false);
      setExpressionText('');
      return;
    }
    const last = input[input.length - 1];
    if ('+-×÷'.includes(last)) {
      setInput(input.slice(0, -1) + op);
    } else {
      setInput(input + op);
    }
  };

  const pressBracket = () => {
    if (justEvaluated) {
      setInput('(');
      setExpressionText('');
      setJustEvaluated(false);
      return;
    }
    const openCount = (input.match(/\(/g) || []).length;
    const closeCount = (input.match(/\)/g) || []).length;
    const last = input[input.length - 1];

    if (input === '0') {
      setInput('(');
    } else if (/[0-9)]/.test(last) && openCount === closeCount) {
      setInput(input + '×(');
    } else if (openCount > closeCount && /[0-9)]/.test(last)) {
      setInput(input + ')');
    } else {
      setInput(input + '(');
    }
  };

  const evaluate = (expr) => {
    try {
      let sanitized = expr.replace(/×/g, '*').replace(/÷/g, '/');
      const open = (sanitized.match(/\(/g) || []).length;
      const close = (sanitized.match(/\)/g) || []).length;
      sanitized += ')'.repeat(Math.max(0, open - close));
      // eslint-disable-next-line no-new-func
      const fn = new Function('return (' + sanitized + ')');
      const result = fn();
      if (!isFinite(result)) return 'Error';
      return String(Math.round(result * 1e10) / 1e10);
    } catch (e) {
      return 'Error';
    }
  };

  const pressPercent = () => {
    const match = input.match(/^(.*)([+\-×÷])(\d+\.?\d*)$/);

    if (match) {
      const [, before, op, numStr] = match;
      const num = parseFloat(numStr);

      if (op === '×' || op === '÷') {
        setInput(before + op + String(num / 100));
      } else {
        const baseResult = evaluate(before);
        if (baseResult === 'Error') return;
        const base = parseFloat(baseResult);
        const percentValue = base * (num / 100);
        setInput(before + op + String(percentValue));
      }
      return;
    }

    const soloMatch = input.match(/(\d+\.?\d*)$/);
    if (!soloMatch) return;
    const percentValue = parseFloat(soloMatch[0]) / 100;
    setInput(input.slice(0, soloMatch.index) + String(percentValue));
  };

  const pressToggleSign = () => {
    const negMatch = input.match(/\(-(\d+\.?\d*)\)$/);
    if (negMatch) {
      setInput(input.slice(0, negMatch.index) + negMatch[1]);
      return;
    }
    const match = input.match(/(\d+\.?\d*)$/);
    if (!match) return;
    setInput(input.slice(0, match.index) + '(-' + match[0] + ')');
  };

  const backspace = () => {
    if (input.length > 1) {
      setInput(input.slice(0, -1));
    } else {
      setInput('0');
    }
  };

  const pressEquals = () => {
    const result = evaluate(input);
    if (result !== 'Error') {
      setHistory((prev) => [
        { id: Date.now().toString(), expression: input, result },
        ...prev,
      ]);
    }
    setExpressionText(input + ' =');
    setInput(result);
    setJustEvaluated(true);
  };

  const selectHistoryItem = (item) => {
    setInput(item.result);
    setExpressionText(item.expression + ' =');
    setJustEvaluated(true);
    setHistoryVisible(false);
  };

  const clearHistory = () => setHistory([]);

  const AnimatedButton = ({ onPress, style, textStyle, label }) => {
    const scale = useRef(new Animated.Value(1)).current;
    const opacity = useRef(new Animated.Value(1)).current;

    const handlePressIn = () => {
      Animated.parallel([
        Animated.spring(scale, { toValue: 0.88, useNativeDriver: true, tension: 300, friction: 10 }),
        Animated.timing(opacity, { toValue: 0.7, duration: 80, useNativeDriver: true }),
      ]).start();
    };
    const handlePressOut = () => {
      Animated.parallel([
        Animated.spring(scale, { toValue: 1, useNativeDriver: true, tension: 300, friction: 10 }),
        Animated.timing(opacity, { toValue: 1, duration: 150, useNativeDriver: true }),
      ]).start();
    };
    const handlePress = () => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onPress();
    };

    return (
      <TouchableOpacity activeOpacity={1} onPressIn={handlePressIn} onPressOut={handlePressOut} onPress={handlePress}>
        <Animated.View style={[style, { transform: [{ scale }], opacity }]}>
          <Text style={textStyle}>{label}</Text>
        </Animated.View>
      </TouchableOpacity>
    );
  };

  const buttons = [
    [
      { label: 'C', type: 'clear', onPress: clear },
      { label: '( )', type: 'func', onPress: pressBracket },
      { label: '%', type: 'func', onPress: pressPercent },
      { label: '÷', type: 'operator', onPress: () => pressOperator('÷') },
    ],
    [
      { label: '7', type: 'digit', onPress: () => pressDigit(7) },
      { label: '8', type: 'digit', onPress: () => pressDigit(8) },
      { label: '9', type: 'digit', onPress: () => pressDigit(9) },
      { label: '×', type: 'operator', onPress: () => pressOperator('×') },
    ],
    [
      { label: '4', type: 'digit', onPress: () => pressDigit(4) },
      { label: '5', type: 'digit', onPress: () => pressDigit(5) },
      { label: '6', type: 'digit', onPress: () => pressDigit(6) },
      { label: '−', type: 'operator', onPress: () => pressOperator('-') },
    ],
    [
      { label: '1', type: 'digit', onPress: () => pressDigit(1) },
      { label: '2', type: 'digit', onPress: () => pressDigit(2) },
      { label: '3', type: 'digit', onPress: () => pressDigit(3) },
      { label: '+', type: 'operator', onPress: () => pressOperator('+') },
    ],
    [
      { label: '+/−', type: 'digit', onPress: pressToggleSign },
      { label: '0', type: 'digit', onPress: () => pressDigit(0) },
      { label: '.', type: 'digit', onPress: pressDecimal },
      { label: '=', type: 'equals', onPress: pressEquals },
    ],
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.displayContainer}>
        <Text style={styles.expressionText}>{expressionText}</Text>
        <Animated.Text
          style={[styles.displayText, { transform: [{ scale: displayScale }] }]}
          numberOfLines={1}
          adjustsFontSizeToFit
        >
          {input}
        </Animated.Text>
        <View style={styles.topRow}>
          <TouchableOpacity onPress={() => setHistoryVisible(true)}>
            <Text style={styles.historyIcon}>🕐</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={backspace}>
            <Text style={styles.backspaceIcon}>⌫</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.keypad}>
        {buttons.map((row, rowIndex) => (
          <View key={rowIndex} style={styles.row}>
            {row.map((btn, btnIndex) => (
              <AnimatedButton
                key={btnIndex}
                onPress={btn.onPress}
                label={btn.label}
                style={[styles.button, btn.type === 'equals' && styles.equalsButton]}
                textStyle={[
                  styles.buttonText,
                  btn.type === 'clear' && styles.clearText,
                  btn.type === 'func' && styles.funcText,
                  btn.type === 'operator' && styles.operatorText,
                  btn.type === 'equals' && styles.equalsText,
                ]}
              />
            ))}
          </View>
        ))}
      </View>

      <Modal visible={historyVisible} animationType="slide" transparent onRequestClose={() => setHistoryVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>History</Text>
              <TouchableOpacity onPress={clearHistory}>
                <Text style={styles.clearHistoryText}>Clear</Text>
              </TouchableOpacity>
            </View>
            {history.length === 0 ? (
              <Text style={styles.emptyHistoryText}>No calculations yet</Text>
            ) : (
              <FlatList
                data={history}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity style={styles.historyItem} onPress={() => selectHistoryItem(item)}>
                    <Text style={styles.historyExpression}>{item.expression}</Text>
                    <Text style={styles.historyResult}>= {item.result}</Text>
                  </TouchableOpacity>
                )}
              />
            )}
            <TouchableOpacity style={styles.closeButton} onPress={() => setHistoryVisible(false)}>
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const BUTTON_SIZE = 76;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000', justifyContent: 'flex-end' },
  displayContainer: { paddingHorizontal: 20, paddingBottom: 20 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 },
  historyIcon: { fontSize: 20, color: '#888' },
  backspaceIcon: { fontSize: 22, color: '#4CD964' },
  expressionText: { color: '#888', fontSize: 20, textAlign: 'right' },
  displayText: { color: '#fff', fontSize: 64, fontWeight: '300', textAlign: 'right' },
  divider: { height: 1, backgroundColor: '#333', marginBottom: 16 },
  keypad: { paddingHorizontal: 16, paddingBottom: 20 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14 },
  button: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    borderRadius: BUTTON_SIZE / 2,
    backgroundColor: '#1C1C1C',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 3,
  },
  equalsButton: { backgroundColor: '#4CAF50', shadowColor: '#4CAF50', shadowOpacity: 0.4 },
  buttonText: { color: '#fff', fontSize: 28, fontWeight: '400' },
  clearText: { color: '#FF6B6B' },
  funcText: { color: '#4CD964' },
  operatorText: { color: '#4CD964' },
  equalsText: { color: '#fff' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#1C1C1C', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '70%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { color: '#fff', fontSize: 22, fontWeight: '600' },
  clearHistoryText: { color: '#FF6B6B', fontSize: 16 },
  emptyHistoryText: { color: '#888', fontSize: 16, textAlign: 'center', paddingVertical: 40 },
  historyItem: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#333' },
  historyExpression: { color: '#888', fontSize: 16 },
  historyResult: { color: '#fff', fontSize: 22, fontWeight: '500', marginTop: 4 },
  closeButton: { marginTop: 16, paddingVertical: 14, alignItems: 'center', backgroundColor: '#333', borderRadius: 12 },
  closeButtonText: { color: '#4CD964', fontSize: 16, fontWeight: '600' },
});