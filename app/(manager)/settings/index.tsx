import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

const SECTIONS = [
  {
    icon: '👥',
    title: 'Personnel',
    description: 'Gérer employés, rôles, accès et PIN',
    route: '/(manager)/settings/staff',
  },
  {
    icon: '🪑',
    title: 'Tables & zones',
    description: 'Ajouter, modifier et organiser les zones et tables',
    route: '/(manager)/settings/tables',
  },
  {
    icon: '🏪',
    title: 'Établissement',
    description: 'Nom, ville et mode de fonctionnement',
    route: '/(manager)/settings/establishment',
  },
  {
    icon: '🍾',
    title: 'Produits',
    description: 'Créer, modifier et organiser les produits',
    route: '/(manager)/settings/products',
  },
  {
    icon: '🖨️',
    title: 'Impression',
    description: 'Générer un ticket PDF, même sans imprimante',
    route: '/(manager)/settings/printing',
  },
  {
    icon: '🧾',
    title: 'Shifts de caisse',
    description: 'Consulter les sessions de caisse et les écarts',
    route: '/(manager)/settings/shifts',
  },
  {
    icon: '🔐',
    title: 'Sécurité',
    description: 'PIN, accès et protections',
    route: '/(manager)/settings/security',
  },
];

export default function SettingsScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={s.container}>
      <ScrollView contentContainerStyle={s.content}>
        <Text style={s.title}>⚙️ Réglages</Text>
        <Text style={s.subtitle}>
          Gère ton établissement sans refaire toute la configuration.
        </Text>

        {SECTIONS.map((section) => (
          <TouchableOpacity
            key={section.title}
            style={s.card}
            activeOpacity={0.85}
            onPress={() => router.push(section.route as any)}
          >
            <View style={s.cardLeft}>
              <Text style={s.icon}>{section.icon}</Text>
              <View style={{ flex: 1 }}>
                <Text style={s.cardTitle}>{section.title}</Text>
                <Text style={s.cardDesc}>{section.description}</Text>
              </View>
            </View>
            <Text style={s.arrow}>›</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },

  content: {
    padding: 20,
    paddingBottom: 28,
  },

  title: {
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 6,
    color: '#111827',
  },

  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 18,
    lineHeight: 20,
  },

  card: {
    backgroundColor: '#F9FAFB',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  cardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },

  icon: {
    fontSize: 26,
  },

  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },

  cardDesc: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 3,
    lineHeight: 18,
  },

  arrow: {
    fontSize: 26,
    color: '#9CA3AF',
    fontWeight: '700',
    marginLeft: 12,
  },
});