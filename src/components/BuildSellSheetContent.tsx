"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { trimTransparentEdges } from "@/lib/images/trim-transparent";
import PageHeader from "@/components/PageHeader";
import PageShell from "@/components/PageShell";
import { SellSheetApplicationPicker } from "@/components/sell-sheet/SellSheetApplicationPicker";
import { SellSheetFeatureEditor } from "@/components/sell-sheet/SellSheetFeatureEditor";
import { SellSheetImageUpload } from "@/components/sell-sheet/SellSheetImageUpload";
import { SellSheetPaintCanAiButton } from "@/components/sell-sheet/SellSheetPaintCanAiButton";
import { SellSheetPaintSystemEditor } from "@/components/sell-sheet/SellSheetPaintSystemEditor";
import { SellSheetPreviewExperience } from "@/components/sell-sheet/SellSheetPreviewExperience";
import { SellSheetLanguageBar } from "@/components/sell-sheet/SellSheetLanguageBar";
import { SellSheetSaveModal } from "@/components/sell-sheet/SellSheetSaveModal";
import { formatMessage } from "@/i18n";
import {
  applyCompanyBrandingToSellSheet,
  type SellSheetCompanyBranding,
} from "@/lib/sell-sheet/persist";
import { seedSellSheetWithDefaultFeatures } from "@/lib/sell-sheet/feature-defaults";
import {
  getInheritedFeatures,
  removeBenefitFromAllTiers,
} from "@/lib/sell-sheet/feature-selection";
import {
  getSellSheetAuthState,
  saveSellSheetForUser,
} from "@/lib/sell-sheet/actions";
import {
  benefitLibraryHasContent,
  EMPTY_BENEFIT_LIBRARY,
  type BenefitLibrary,
} from "@/lib/sell-sheet/benefit-library";
import {
  clearSellSheetDraft,
  readSellSheetDraft,
  sellSheetDraftHasContent,
  writeSellSheetDraft,
} from "@/lib/sell-sheet/draft-storage";
import { applyLocaleToSellSheetData } from "@/lib/sell-sheet/sell-sheet-locale";
import {
  buildLoginHref,
  buildSignupHref,
} from "@/lib/auth/login-redirect";
import { scrollSiteMainToTop } from "@/lib/scroll";
import { applyDiscoveredPaintSystemFeatures } from "@/lib/sell-sheet/sell-sheet-limits";
import {
  createEmptySellSheet,
  updateTier,
} from "@/lib/sell-sheet/utils";
import { useLanguage } from "@/providers/LanguageProvider";
import {
  SELL_SHEET_TIER_KEYS,
  type SellSheetData,
  type SellSheetTierKey,
} from "@/types/sell-sheet";

type BuildSellSheetContentProps = {
  editId?: string;
  initialData?: SellSheetData;
  companyBranding?: SellSheetCompanyBranding | null;
  initialBenefitLibrary?: BenefitLibrary;
  initialPaintSystemLibrary?: string[];
  isLoggedIn?: boolean;
  editRequiresSignIn?: boolean;
  forceNew?: boolean;
};

export default function BuildSellSheetContent({
  editId,
  initialData,
  companyBranding = null,
  initialBenefitLibrary = EMPTY_BENEFIT_LIBRARY,
  initialPaintSystemLibrary = [],
  isLoggedIn = false,
  editRequiresSignIn = false,
  forceNew = false,
}: BuildSellSheetContentProps) {
  const { locale, t } = useLanguage();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const nav = t("nav");
  const sellSheet = t("sellSheet");

  const loginReturnTo = useMemo(() => {
    const query = searchParams.toString();
    return query ? `${pathname}?${query}` : pathname;
  }, [pathname, searchParams]);

  const initialEmpty = useMemo(
    () => createEmptySellSheet(sellSheet.tierLabels, locale),
    [locale, sellSheet.tierLabels],
  );

  useEffect(() => {
    if (prevLocaleRef.current === locale) return;

    setData((prev) =>
      applyLocaleToSellSheetData(prev, locale, prevLocaleRef.current),
    );
    prevLocaleRef.current = locale;
  }, [locale]);

  const logoTouchedRef = useRef(Boolean(initialData?.logoImage?.trim()));
  const initialTrimDoneRef = useRef(false);
  const autoSaveAttemptedRef = useRef(false);
  const draftLoggedOutRef = useRef(false);
  const draftHydratedRef = useRef(false);
  const prevLocaleRef = useRef(locale);

  const seedSheet = useCallback(
    (sheet: SellSheetData) =>
      applyCompanyBrandingToSellSheet(
        seedSellSheetWithDefaultFeatures(sheet, locale),
        companyBranding,
      ),
    [companyBranding, locale],
  );

  const [data, setData] = useState<SellSheetData>(() => {
    if (forceNew) {
      return seedSheet(initialEmpty);
    }

    if (initialData) {
      return seedSheet(initialData);
    }

    return seedSheet(initialEmpty);
  });

  const [draftReady, setDraftReady] = useState(
    () => Boolean(forceNew || initialData),
  );

  const dataRef = useRef(data);
  dataRef.current = data;

  const seededLogo = useMemo(
    () =>
      applyCompanyBrandingToSellSheet(
        initialData ?? initialEmpty,
        companyBranding,
      ).logoImage,
    [initialData, initialEmpty, companyBranding],
  );

  useEffect(() => {
    if (!seededLogo || logoTouchedRef.current || initialTrimDoneRef.current) {
      return;
    }

    initialTrimDoneRef.current = true;
    let cancelled = false;

    trimTransparentEdges(seededLogo)
      .then((result) => {
        if (cancelled || result.src === seededLogo || logoTouchedRef.current) {
          return;
        }
        setData((prev) =>
          prev.logoImage === seededLogo
            ? { ...prev, logoImage: result.src }
            : prev,
        );
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [seededLogo]);

  const handleLogoChange = (logoImage: string | null) => {
    logoTouchedRef.current = true;
    setData((prev) => ({ ...prev, logoImage }));
  };

  const [savedSellSheetId, setSavedSellSheetId] = useState<string | undefined>(
    () => {
      if (forceNew) return undefined;
      return editId;
    },
  );
  const [showPreview, setShowPreview] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [paintCanAiErrors, setPaintCanAiErrors] = useState<
    Partial<Record<SellSheetTierKey, string>>
  >({});
  const [benefitLibrary, setBenefitLibrary] = useState<BenefitLibrary>(
    () => initialBenefitLibrary,
  );
  const benefitLibraryRef = useRef(benefitLibrary);
  benefitLibraryRef.current = benefitLibrary;
  const [paintSystemLibrary, setPaintSystemLibrary] = useState(
    initialPaintSystemLibrary,
  );

  const applicationLabels = useMemo(
    () => ({
      interior: sellSheet.applicationInterior,
      exterior: sellSheet.applicationExterior,
    }),
    [sellSheet.applicationInterior, sellSheet.applicationExterior],
  );

  const persistDraft = useCallback(
    (snapshot: SellSheetData, sellSheetId?: string) => {
      if (initialData) return;

      const hasSheetContent = sellSheetDraftHasContent(snapshot);
      const hasGuestLibrary =
        !isLoggedIn && benefitLibraryHasContent(benefitLibraryRef.current);
      if (!hasSheetContent && !hasGuestLibrary) {
        return;
      }

      writeSellSheetDraft({
        data: snapshot,
        sellSheetId,
        isLoggedIn,
        createdWhileLoggedOut: draftLoggedOutRef.current,
        benefitLibrary: isLoggedIn
          ? undefined
          : benefitLibraryRef.current,
      });
    },
    [initialData, isLoggedIn],
  );

  const flushDraft = useCallback(() => {
    persistDraft(dataRef.current, savedSellSheetId);
  }, [persistDraft, savedSellSheetId]);

  useEffect(() => {
    if (forceNew) {
      clearSellSheetDraft();
      draftLoggedOutRef.current = false;
      draftHydratedRef.current = true;
      setDraftReady(true);
      return;
    }

    if (initialData) {
      draftHydratedRef.current = true;
      setDraftReady(true);
      return;
    }

    if (draftHydratedRef.current) return;
    draftHydratedRef.current = true;

    const storedDraft = readSellSheetDraft();
    if (storedDraft) {
      draftLoggedOutRef.current = storedDraft.createdWhileLoggedOut;
      if (storedDraft.data.logoImage?.trim()) {
        logoTouchedRef.current = true;
      }
      setData(seedSheet(storedDraft.data));
      if (storedDraft.sellSheetId) {
        setSavedSellSheetId(storedDraft.sellSheetId);
      }
      if (!isLoggedIn) {
        const legacyDraft = storedDraft as typeof storedDraft & {
          hiddenCatalogIds?: string[];
        };
        if (storedDraft.benefitLibrary) {
          setBenefitLibrary(storedDraft.benefitLibrary);
        } else if (legacyDraft.hiddenCatalogIds?.length) {
          setBenefitLibrary((prev) => ({
            ...prev,
            hiddenCatalogIds: legacyDraft.hiddenCatalogIds!,
          }));
        }
      }
    } else if (!isLoggedIn) {
      draftLoggedOutRef.current = true;
    }

    setDraftReady(true);
  }, [forceNew, initialData, isLoggedIn, seedSheet]);

  useEffect(() => {
    if (initialData || !draftReady) return;

    const timer = window.setTimeout(() => {
      persistDraft(dataRef.current, savedSellSheetId);
    }, 400);

    return () => window.clearTimeout(timer);
  }, [data, draftReady, initialData, persistDraft, savedSellSheetId]);

  useEffect(() => {
    if (initialData || isLoggedIn || !draftReady) return;
    persistDraft(dataRef.current, savedSellSheetId);
  }, [
    benefitLibrary,
    draftReady,
    initialData,
    isLoggedIn,
    persistDraft,
    savedSellSheetId,
  ]);

  useEffect(() => {
    if (initialData) return;

    const flushOnLeave = () => {
      flushDraft();
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        flushOnLeave();
      }
    };

    window.addEventListener("pagehide", flushOnLeave);
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      window.removeEventListener("pagehide", flushOnLeave);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [flushDraft, initialData]);

  useEffect(() => {
    if (initialData || autoSaveAttemptedRef.current) return;

    let cancelled = false;

    const attemptAutoSave = async () => {
      const auth = await getSellSheetAuthState();
      if (cancelled || !auth.isLoggedIn) return;

      const snapshot = dataRef.current;
      if (!sellSheetDraftHasContent(snapshot)) return;

      const storedDraft = readSellSheetDraft();
      const shouldAutoSave =
        draftLoggedOutRef.current || storedDraft?.createdWhileLoggedOut;
      if (!shouldAutoSave) return;

      autoSaveAttemptedRef.current = true;

      const result = await saveSellSheetForUser(
        snapshot,
        savedSellSheetId ?? storedDraft?.sellSheetId,
        storedDraft?.benefitLibrary ?? benefitLibraryRef.current,
      );

      if (cancelled) return;

      if (!result.success) {
        autoSaveAttemptedRef.current = false;
        toast.error(result.error);
        return;
      }

      const sellSheetId = result.data!.sellSheetId;
      clearSellSheetDraft();
      draftLoggedOutRef.current = false;
      setSavedSellSheetId(sellSheetId);

      if (!editId) {
        window.history.replaceState(
          null,
          "",
          `/free-tools/build-sell-sheet?edit=${sellSheetId}`,
        );
      }

      toast.success(sellSheet.saveModal.saved);
      router.refresh();
    };

    void attemptAutoSave();

    const onFocus = () => {
      void attemptAutoSave();
    };

    window.addEventListener("focus", onFocus);
    return () => {
      cancelled = true;
      window.removeEventListener("focus", onFocus);
    };
  }, [
    editId,
    initialData,
    isLoggedIn,
    router,
    savedSellSheetId,
    sellSheet.saveModal.saved,
  ]);

  const handlePreview = () => {
    if (!data.companyName.trim()) {
      setFormError(sellSheet.validation.companyRequired);
      return;
    }

    setFormError(null);
    setShowPreview(true);
    scrollSiteMainToTop();
  };

  if (showPreview) {
    return (
      <PageShell as="main" className="sell-sheet-preview-page">
        <SellSheetPreviewExperience
          key={locale}
          data={data}
          onBack={() => setShowPreview(false)}
          backLabel={sellSheet.backToEdit}
          webTabLabel={sellSheet.webPreview}
          pdfTabLabel={sellSheet.pdfPreview}
          paintSystemHeading={sellSheet.paintSystemHeading}
          benefitsHeading={sellSheet.benefitsHeading}
          warrantyHeading={sellSheet.warrantyHeading}
          systemsGuideLabel={sellSheet.systemsGuide}
          applicationLabels={applicationLabels}
          preparedByFooter={formatMessage(sellSheet.preparedByFooter, {
            company:
              data.companyName.trim() || sellSheet.defaultCompanyName,
          })}
          downloadPdfLabel={sellSheet.downloadPdf}
          pdfPreviewLabel={sellSheet.pdfPreviewTitle}
          pdfLoadingLabel={sellSheet.pdfLoading}
        />
      </PageShell>
    );
  }

  return (
    <PageShell as="main">
      <Link href="/free-tools" className="type-link">
        {nav.backToFreeTools}
      </Link>

      <PageHeader
        className="mt-6 lg:mt-8"
        title={sellSheet.title}
        subtitle={sellSheet.subtitle}
      />

      <div className="mt-6 lg:mt-8">
        <SellSheetLanguageBar />
      </div>

      {editRequiresSignIn ? (
        <div
          className="mt-6 rounded-lg border border-amber-200/80 bg-amber-50 px-4 py-3 text-sm text-amber-950"
          role="status"
        >
          <p>{sellSheet.validation.editRequiresSignIn}</p>
          <div className="mt-3 flex flex-wrap gap-4">
            <Link
              href={buildLoginHref(loginReturnTo)}
              onClick={flushDraft}
              className="font-semibold text-primary hover:underline"
            >
              {sellSheet.saveModal.signInInstead}
            </Link>
            <Link
              href={buildSignupHref(loginReturnTo)}
              onClick={flushDraft}
              className="font-semibold text-primary hover:underline"
            >
              {sellSheet.saveModal.createFreeAccount}
            </Link>
          </div>
        </div>
      ) : null}

      <form
          key={locale}
          className="surface-form mt-8 w-full space-y-10 rounded-xl p-6 sm:p-8 lg:mt-10 lg:p-10"
          onSubmit={(event) => {
            event.preventDefault();
            handlePreview();
          }}
        >
          <section className="space-y-6">
            <h2 className="form-section-title">{sellSheet.brandingLegend}</h2>
            <div className="grid gap-6 lg:grid-cols-2 lg:gap-8">
              <div>
                <label htmlFor="company" className="form-section-title">
                  {sellSheet.companyName}
                </label>
                <input
                  id="company"
                  type="text"
                  className="form-input"
                  value={data.companyName}
                  onChange={(event) =>
                    setData((prev) => ({
                      ...prev,
                      companyName: event.target.value,
                    }))
                  }
                />
              </div>
              <div>
                <label htmlFor="project" className="form-section-title">
                  {sellSheet.projectName}
                </label>
                <input
                  id="project"
                  type="text"
                  className="form-input"
                  placeholder={sellSheet.projectPlaceholder}
                  value={data.projectName}
                  onChange={(event) =>
                    setData((prev) => ({
                      ...prev,
                      projectName: event.target.value,
                    }))
                  }
                />
              </div>
            </div>
            <SellSheetImageUpload
              id="company-logo"
              label={sellSheet.logoUpload}
              hint={sellSheet.logoHint}
              value={data.logoImage}
              onChange={handleLogoChange}
              variant="logo"
            />
          </section>

          <section>
            <h2 className="form-section-title">{sellSheet.tiersLegend}</h2>
            <p className="mt-2 max-w-2xl text-sm text-silver-600">
              {sellSheet.tiersHint}
            </p>

            <div className="mt-6">
              <SellSheetApplicationPicker
                id="sell-sheet-application-type"
                label={sellSheet.applicationType}
                hint={sellSheet.applicationTypeHint}
                value={data.applicationType}
                onChange={(applicationType) =>
                  setData((prev) => ({ ...prev, applicationType }))
                }
                labels={{
                  interior: sellSheet.applicationInterior,
                  exterior: sellSheet.applicationExterior,
                }}
              />
            </div>

            <div className="mt-4 grid gap-5 lg:grid-cols-3 lg:gap-6">
              {SELL_SHEET_TIER_KEYS.map((key) => {
                const tier = data.tiers.find((entry) => entry.key === key)!;
                const tierLabel = sellSheet.tierLabels[key];
                const isBest = key === "best";

                return (
                  <div
                    key={key}
                    className={`tier-card space-y-4 ${isBest ? "tier-card-best" : ""}`}
                  >
                    <p className="font-display text-xl text-navy-900">
                      {tierLabel}
                    </p>

                    <div>
                      <label
                        htmlFor={`${key}-display-name`}
                        className="form-section-title"
                      >
                        {formatMessage(sellSheet.tierDisplayName, {
                          tier: tierLabel,
                        })}
                      </label>
                      <input
                        id={`${key}-display-name`}
                        type="text"
                        className="form-input"
                        value={tier.displayName}
                        onChange={(event) =>
                          setData((prev) =>
                            updateTier(prev, key, {
                              displayName: event.target.value,
                            }),
                          )
                        }
                      />
                    </div>

                    <div>
                      <label
                        htmlFor={`${key}-manufacturer`}
                        className="form-section-title"
                      >
                        {formatMessage(sellSheet.manufacturer, { tier: tierLabel })}
                      </label>
                      <input
                        id={`${key}-manufacturer`}
                        type="text"
                        placeholder={sellSheet.manufacturerPlaceholder}
                        className="form-input"
                        value={tier.manufacturer}
                        onChange={(event) =>
                          setData((prev) =>
                            updateTier(prev, key, {
                              manufacturer: event.target.value,
                            }),
                          )
                        }
                      />
                    </div>

                    <div>
                      <label
                        htmlFor={`${key}-paint-type`}
                        className="form-section-title"
                      >
                        {formatMessage(sellSheet.paintType, { tier: tierLabel })}
                      </label>
                      <input
                        id={`${key}-paint-type`}
                        type="text"
                        placeholder={sellSheet.paintTypePlaceholder}
                        className="form-input"
                        value={tier.paintType}
                        onChange={(event) =>
                          setData((prev) =>
                            updateTier(prev, key, {
                              paintType: event.target.value,
                            }),
                          )
                        }
                      />
                    </div>

                    <SellSheetPaintCanAiButton
                      manufacturer={tier.manufacturer}
                      paintType={tier.paintType}
                      applicationType={data.applicationType}
                      tierKey={key}
                      sellSheetId={savedSellSheetId}
                      labels={{
                        findWithAi: sellSheet.findProductWithAi,
                        progress: sellSheet.aiLookupProgress,
                      }}
                      onProductFound={({ imageUrl, paintSystemFeatures }) => {
                        setPaintCanAiErrors((prev) => ({ ...prev, [key]: "" }));
                        setData((prev) => {
                          const currentTier = prev.tiers.find(
                            (entry) => entry.key === key,
                          )!;
                          const discovered =
                            applyDiscoveredPaintSystemFeatures(
                              paintSystemFeatures,
                              currentTier.paintSystemFeatureOptions ?? [],
                            );

                          return updateTier(prev, key, {
                            paintCanImage: imageUrl,
                            paintSystemFeatureOptions:
                              paintSystemFeatures.length > 0
                                ? discovered.options
                                : currentTier.paintSystemFeatureOptions ?? [],
                            paintSystemFeatures:
                              paintSystemFeatures.length > 0
                                ? discovered.selected
                                : currentTier.paintSystemFeatures ?? [],
                          });
                        });
                      }}
                      onError={(message) =>
                        setPaintCanAiErrors((prev) => ({
                          ...prev,
                          [key]: message,
                        }))
                      }
                    />

                    {paintCanAiErrors[key] ? (
                      <p className="text-sm text-red-600">{paintCanAiErrors[key]}</p>
                    ) : null}

                    <SellSheetPaintSystemEditor
                      id={`${key}-paint-system`}
                      label={formatMessage(sellSheet.paintSystem, { tier: tierLabel })}
                      hint={sellSheet.paintSystemHint}
                      tierKey={key}
                      featureOptions={tier.paintSystemFeatureOptions ?? []}
                      selectedFeatures={tier.paintSystemFeatures ?? []}
                      paintSystemLibrary={paintSystemLibrary}
                      isLoggedIn={isLoggedIn}
                      onPaintSystemLibraryChange={setPaintSystemLibrary}
                      onChange={setData}
                      addLabel={sellSheet.paintSystemAdd}
                      inputPlaceholder={sellSheet.paintSystemPlaceholder}
                      emptyHint={sellSheet.paintSystemEmptyHint}
                      editLabel={sellSheet.editSelection}
                      doneLabel={sellSheet.done}
                      moreItemsLabel={sellSheet.moreItems}
                      libraryLegend={sellSheet.paintSystemLibraryLegend}
                      libraryHint={sellSheet.paintSystemLibraryHint}
                      signInForLibrary={sellSheet.signInForLibrary}
                      selectAll={sellSheet.selectAll}
                      clearAll={sellSheet.clearAll}
                      addToLibrary={sellSheet.addToLibrary}
                      removeFromLibrary={sellSheet.removeFromLibrary}
                      optionsLegend={sellSheet.paintSystemOptionsLegend}
                      optionsHint={sellSheet.paintSystemOptionsHint}
                      paintSystemPageLimit={sellSheet.paintSystemPageLimit}
                      paintSystemLimitReached={sellSheet.paintSystemLimitReached}
                      paintSystemOptionsLimitReached={
                        sellSheet.paintSystemOptionsLimitReached
                      }
                    />

                    <SellSheetImageUpload
                      id={`${key}-paint-can`}
                      label={formatMessage(sellSheet.paintCanUpload, {
                        tier: tierLabel,
                      })}
                      hint={sellSheet.paintCanHint}
                      value={tier.paintCanImage}
                      onChange={(paintCanImage) =>
                        setData((prev) =>
                          updateTier(prev, key, { paintCanImage }),
                        )
                      }
                      variant="paint-can"
                    />

                    <SellSheetFeatureEditor
                      id={`${key}-features`}
                      label={formatMessage(sellSheet.benefits, { tier: tierLabel })}
                      tierKey={key}
                      applicationType={data.applicationType}
                      inheritedFeatures={getInheritedFeatures(data, key)}
                      features={tier.features}
                      benefitLibrary={benefitLibrary}
                      isLoggedIn={isLoggedIn}
                      onBenefitLibraryChange={setBenefitLibrary}
                      onRemoveFromAllTiers={(label) =>
                        setData((prev) => removeBenefitFromAllTiers(prev, label))
                      }
                      onChange={setData}
                      labels={{
                        catalogHint: sellSheet.featureCatalogHint,
                        catalogLegend: sellSheet.catalogLegend,
                        inheritedHint: sellSheet.featureInheritedHint,
                        selectAll: sellSheet.selectAll,
                        clearAll: sellSheet.clearAll,
                        selectApplicationFirst: sellSheet.selectApplicationFirst,
                        manageCategory: sellSheet.manageCategory,
                        manageCategoryHint: sellSheet.manageCategoryHint,
                        includeInCatalog: sellSheet.includeInCatalog,
                        scopeInterior: sellSheet.applicationInterior,
                        scopeExterior: sellSheet.applicationExterior,
                        categoryLabels: sellSheet.featureCategories,
                        inputPlaceholder: sellSheet.featurePlaceholder,
                        addLabel: sellSheet.addFeature,
                        removeFromLibrary: sellSheet.removeFromLibrary,
                        duplicateItemError: sellSheet.libraryDuplicateItem,
                        packageOnlyFeaturesLegend:
                          sellSheet.packageOnlyFeaturesLegend,
                        emptyHint: sellSheet.featuresEmptyHint,
                        editLabel: sellSheet.editSelection,
                        doneLabel: sellSheet.done,
                        moreItemsLabel: sellSheet.moreItems,
                        benefitsPageLimit: sellSheet.benefitsPageLimit,
                        benefitsLimitReached: sellSheet.benefitsLimitReached,
                        benefitsInheritedNote: sellSheet.benefitsInheritedNote,
                        benefitsClearedInheritedToast:
                          sellSheet.benefitsClearedInheritedToast,
                        warrantyLengthLegend: sellSheet.warrantyPeriod,
                        warrantyPeriodHint: sellSheet.warrantyPeriodHint,
                        warrantyLengthNone: sellSheet.warrantyLengthNone,
                      }}
                    />
                  </div>
                );
              })}
            </div>
          </section>

          <div className="flex flex-col items-end gap-3 border-t border-silver-300/60 pt-8 sm:flex-row sm:justify-between">
            {formError ? (
              <p className="w-full text-sm text-red-600 sm:w-auto">{formError}</p>
            ) : (
              <p className="w-full text-sm text-silver-600 sm:mr-auto">
                {sellSheet.previewHint}
              </p>
            )}
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => {
                  if (!data.companyName.trim()) {
                    setFormError(sellSheet.validation.companyRequired);
                    return;
                  }
                  setFormError(null);
                  setShowSaveModal(true);
                }}
                className="btn-outline-dark px-6 py-3.5"
              >
                {sellSheet.save}
              </button>
              <button type="submit" className="btn-primary px-8 py-3.5">
                {sellSheet.preview}
              </button>
            </div>
          </div>
        </form>

        <SellSheetSaveModal
          open={showSaveModal}
          onClose={() => setShowSaveModal(false)}
          getData={() => dataRef.current}
          getBenefitLibrary={() =>
            isLoggedIn ? undefined : benefitLibraryRef.current
          }
          sellSheetId={savedSellSheetId}
          loginReturnTo={loginReturnTo}
          onBeforeLogin={flushDraft}
          labels={sellSheet.saveModal}
          onSaved={(sellSheetId) => {
            setShowSaveModal(false);
            setSavedSellSheetId(sellSheetId);
            clearSellSheetDraft();
            draftLoggedOutRef.current = false;
            if (!editId) {
              window.history.replaceState(
                null,
                "",
                `/free-tools/build-sell-sheet?edit=${sellSheetId}`,
              );
            }
            toast.success(sellSheet.saveModal.saved);
            router.refresh();
          }}
        />
      </PageShell>
  );
}