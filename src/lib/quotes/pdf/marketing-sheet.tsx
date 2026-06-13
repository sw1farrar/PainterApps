import {
  Document,
  Image,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";
import { isAbsoluteHttpUrl } from "@/lib/utils";
import type {
  Company,
  Customer,
  Quote,
  QuoteLineItem,
  QuoteRoom,
  QuoteTier,
} from "@/types/database";

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: "Helvetica",
    color: "#0a1428",
  },
  header: {
    marginBottom: 24,
    borderBottomWidth: 2,
    borderBottomColor: "#2b6cb8",
    paddingBottom: 12,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 8,
  },
  logo: {
    width: 64,
    height: 64,
    objectFit: "contain",
  },
  companyName: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#0a1428",
  },
  subtitle: {
    fontSize: 11,
    color: "#4f5c6c",
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "bold",
    marginBottom: 8,
    marginTop: 16,
    color: "#1e5a9e",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  tierGrid: {
    flexDirection: "row",
    gap: 8,
    marginTop: 8,
  },
  tierCard: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#d4dbe4",
    borderRadius: 6,
    padding: 10,
    backgroundColor: "#f8fafc",
  },
  tierName: {
    fontSize: 12,
    fontWeight: "bold",
    textTransform: "capitalize",
    marginBottom: 4,
  },
  tierPrice: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1e5a9e",
    marginBottom: 6,
  },
  bullet: {
    fontSize: 8,
    marginBottom: 2,
    color: "#4f5c6c",
  },
  footer: {
    position: "absolute",
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: "center",
    fontSize: 8,
    color: "#8d9aad",
  },
});

const TIER_LABELS: Record<string, string> = {
  good: "Good",
  better: "Better",
  best: "Best",
  beautiful: "Beautiful",
};

function formatMoney(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}

export type MarketingSheetProps = {
  company: Company;
  customer: Customer;
  quote: Quote;
  rooms: QuoteRoom[];
  lineItems: QuoteLineItem[];
  tiers: QuoteTier[];
};

export function MarketingSheetDocument({
  company,
  customer,
  quote,
  rooms,
  lineItems,
  tiers,
}: MarketingSheetProps) {
  const sortedTiers = [...tiers].sort((a, b) => a.price - b.price);
  const logoUrl = isAbsoluteHttpUrl(company.logo_url) ? company.logo_url : null;

  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        <View style={styles.header}>
          {logoUrl ? (
            <View style={styles.headerRow}>
              {/* @react-pdf/renderer Image does not support alt */}
              {/* eslint-disable-next-line jsx-a11y/alt-text */}
              <Image src={logoUrl} style={styles.logo} />
              <Text style={styles.companyName}>{company.name}</Text>
            </View>
          ) : (
            <Text style={styles.companyName}>{company.name}</Text>
          )}
          <Text style={styles.subtitle}>
            Painting Proposal for {customer.name}
          </Text>
          <Text style={styles.subtitle}>{quote.job_address}</Text>
        </View>

        <Text style={styles.sectionTitle}>Choose Your Package</Text>
        <View style={styles.tierGrid}>
          {sortedTiers.map((tier) => (
            <View key={tier.id} style={styles.tierCard}>
              <Text style={styles.tierName}>
                {TIER_LABELS[tier.tier] ?? tier.tier}
              </Text>
              <Text style={styles.tierPrice}>{formatMoney(tier.price)}</Text>
              {(tier.features ?? []).slice(0, 4).map((feature, i) => (
                <Text key={`f-${i}`} style={styles.bullet}>
                  • {feature}
                </Text>
              ))}
              {(tier.benefits ?? []).slice(0, 2).map((benefit, i) => (
                <Text key={`b-${i}`} style={styles.bullet}>
                  ✓ {benefit}
                </Text>
              ))}
            </View>
          ))}
        </View>

        {rooms.length > 0 ? (
          <>
            <Text style={styles.sectionTitle}>Rooms & Surfaces</Text>
            {rooms.map((room) => (
              <View key={room.id} style={styles.row}>
                <Text>
                  {room.name} — {room.sq_ft} sq ft, {room.coats} coats
                </Text>
                <Text>{room.surface_type}</Text>
              </View>
            ))}
          </>
        ) : null}

        {lineItems.length > 0 ? (
          <>
            <Text style={styles.sectionTitle}>Scope of Work</Text>
            {lineItems.map((item) => (
              <View key={item.id} style={styles.row}>
                <Text>
                  {item.description} ({item.type})
                </Text>
                <Text>
                  {item.qty} × {formatMoney(item.unit_cost)}
                </Text>
              </View>
            ))}
          </>
        ) : null}

        <Text style={styles.footer}>
          {company.phone ? `${company.phone} · ` : ""}
          {company.email ?? ""} · Prepared by {company.name}
        </Text>
      </Page>
    </Document>
  );
}