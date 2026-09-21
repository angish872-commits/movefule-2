package com.movefuel.mufil2.ui.navigation

import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.core.tween
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.platform.LocalContext
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import com.movefuel.mufil2.ui.design.MoveFuelMotion
import com.movefuel.mufil2.ui.master.FuelMasterDashboard
import com.movefuel.mufil2.ui.master.ProgressMasterDashboard
import com.movefuel.mufil2.ui.master.TodayMasterDashboard
import com.movefuel.mufil2.ui.master.TrainMasterDashboard
import com.movefuel.mufil2.ui.screens.auth.*
import com.movefuel.mufil2.ui.screens.onb.*
import com.movefuel.mufil2.ui.screens.tod.*
import com.movefuel.mufil2.ui.screens.cam.*
import com.movefuel.mufil2.ui.screens.bar.*
import com.movefuel.mufil2.ui.screens.fno.*
import com.movefuel.mufil2.ui.screens.fpl.*
import com.movefuel.mufil2.ui.screens.fsh.*
import com.movefuel.mufil2.ui.screens.rcp.*
import com.movefuel.mufil2.ui.screens.trs.*
import com.movefuel.mufil2.ui.screens.trn.*
import com.movefuel.mufil2.ui.screens.wrk.*
import com.movefuel.mufil2.ui.screens.sor.*
import com.movefuel.mufil2.ui.screens.rdy.*
import com.movefuel.mufil2.ui.screens.exr.*
import com.movefuel.mufil2.ui.screens.cal.*
import com.movefuel.mufil2.ui.screens.prg.*
import com.movefuel.mufil2.ui.screens.pro.*
import com.movefuel.mufil2.ui.screens.dev.*
import com.movefuel.mufil2.ui.screens.bil.*
import com.movefuel.mufil2.ui.screens.war.*
import com.movefuel.mufil2.ui.screens.sys.*
import com.movefuel.mufil2.ui.state.TrainState
import com.movefuel.mufil2.ui.state.TrainStateStore
import com.movefuel.mufil2.ui.state.CanonicalAppState
import com.movefuel.mufil2.ui.state.CanonicalStateStore
import com.movefuel.mufil2.ui.state.FoodDraftSource
import com.movefuel.mufil2.ui.state.toTodayUiState
import kotlinx.coroutines.launch

@Composable
fun MoveFuelNavGraph(navController: NavHostController) {
    val context = LocalContext.current.applicationContext
    val scope = rememberCoroutineScope()
    val trainState by TrainStateStore.observeState(context)
        .collectAsState(initial = TrainState.NotConfigured)
    val trainSetupStep by TrainStateStore.observeSetupStep(context)
        .collectAsState(initial = null)
    val canonicalState by CanonicalStateStore.observe(context)
        .collectAsState(initial = CanonicalAppState())
    var pendingFoodSource by remember { mutableStateOf<FoodDraftSource?>(null) }

    LaunchedEffect(Unit) {
        TrainStateStore.ensureInitialized(context)
    }

    fun trainEntryRoute(): MoveFuelRoute =
        when (trainState) {
            TrainState.NotConfigured -> MoveFuelRoute.TRS_001
            TrainState.SetupIncomplete -> {
                trainSetupStep
                    ?.let { stored -> runCatching { MoveFuelRoute.valueOf(stored) }.getOrNull() }
                    ?.takeIf { route ->
                        route.name.startsWith("TRS_") &&
                            route != MoveFuelRoute.TRS_001 &&
                            route != MoveFuelRoute.TRS_020
                    }
                    ?: MoveFuelRoute.TRS_002
            }
            TrainState.PlanPreview -> MoveFuelRoute.TRS_020
            TrainState.Active -> MoveFuelRoute.TRN_001
        }

    val currentBackStackEntry by navController.currentBackStackEntryAsState()
    val currentRoutePath = currentBackStackEntry?.destination?.route
    val currentRoute = MoveFuelRoute.values().firstOrNull { it.path == currentRoutePath }

    LaunchedEffect(currentRoutePath) {
        val currentRoute = MoveFuelRoute.values().firstOrNull { it.path == currentRoutePath }
        val stepNumber = currentRoute
            ?.name
            ?.takeIf { it.startsWith("TRS_") }
            ?.substringAfter("TRS_")
            ?.toIntOrNull()

        when {
            currentRoute?.name?.startsWith("ONB_") == true ->
                CanonicalStateStore.persistOnboardingStep(context, currentRoute!!.name)

            currentRoute == MoveFuelRoute.TRS_020 ->
                TrainStateStore.markPlanPreview(context)

            stepNumber != null && stepNumber in 2..19 ->
                TrainStateStore.markSetupIncomplete(context, currentRoute!!.name)

            currentRoute == MoveFuelRoute.WRK_001 ->
                CanonicalStateStore.beginWorkout(context)
        }
    }

    val navigate: (MoveFuelRoute) -> Unit = { requestedRoute ->
        when {
            currentRoute == MoveFuelRoute.ONB_018 && requestedRoute in setOf(
                MoveFuelRoute.MASTER_TODAY,
                MoveFuelRoute.TOD_001,
            ) -> scope.launch { CanonicalStateStore.completeOnboarding(context) }
            currentRoute == MoveFuelRoute.CAM_017 -> pendingFoodSource = FoodDraftSource.Camera
            currentRoute == MoveFuelRoute.BAR_011 -> pendingFoodSource = FoodDraftSource.Barcode
            currentRoute == MoveFuelRoute.RCP_014 -> pendingFoodSource = FoodDraftSource.Recipe
            currentRoute == MoveFuelRoute.FNO_011 -> pendingFoodSource = FoodDraftSource.Search
            currentRoute == MoveFuelRoute.WRK_012 && requestedRoute == MoveFuelRoute.WRK_013 ->
                scope.launch { CanonicalStateStore.recordPerformedSet(context) }
            currentRoute == MoveFuelRoute.WRK_032 && requestedRoute in setOf(
                MoveFuelRoute.MASTER_TRAIN,
                MoveFuelRoute.MASTER_PROGRESS,
            ) -> scope.launch { CanonicalStateStore.commitWorkoutSummary(context) }
            currentRoute == MoveFuelRoute.DEV_007 && requestedRoute == MoveFuelRoute.DEV_009 ->
                scope.launch { CanonicalStateStore.markSyncPending(context) }
            currentRoute == MoveFuelRoute.DEV_009 ->
                scope.launch { CanonicalStateStore.markSyncPending(context) }
        }
        if (requestedRoute == MoveFuelRoute.FNO_001 && currentRoute in setOf(
                MoveFuelRoute.FNO_012,
                MoveFuelRoute.CAM_017,
                MoveFuelRoute.BAR_011,
            )) {
            val source = pendingFoodSource ?: canonicalState.pendingFoodSource ?: FoodDraftSource.Search
            scope.launch { CanonicalStateStore.confirmFood(context, null, source) }
            pendingFoodSource = null
        }
        val route = when {
            requestedRoute == MoveFuelRoute.MASTER_TRAIN -> trainEntryRoute()
            requestedRoute.name.startsWith("TRN_") && trainState != TrainState.Active ->
                trainEntryRoute()
            requestedRoute.name.startsWith("WRK_") && trainState != TrainState.Active ->
                trainEntryRoute()
            else -> requestedRoute
        }

        val isPrimaryRequest = requestedRoute in setOf(
            MoveFuelRoute.MASTER_TODAY,
            MoveFuelRoute.MASTER_FUEL,
            MoveFuelRoute.MASTER_TRAIN,
            MoveFuelRoute.MASTER_PROGRESS,
        )
        val reusedExistingPrimary =
            isPrimaryRequest && navController.popBackStack(route.path, inclusive = false)

        if (!reusedExistingPrimary) {
            navController.navigate(route.path) {
                launchSingleTop = true
            }
        }
    }

    val activateTrainPlan: () -> Unit = {
        scope.launch {
            // TrainStateStore.markActive(context) remains the audited activation boundary;
            // the canonical store refuses activation until a real plan reference exists.
            if (CanonicalStateStore.activatePlan(context)) {
                navController.navigate(MoveFuelRoute.TRN_001.path) {
                    launchSingleTop = true
                    popUpTo(MoveFuelRoute.TRS_001.path) {
                        inclusive = true
                    }
                }
            }
        }
    }

    CompositionLocalProvider(
        LocalMoveFuelBack provides { navController.popBackStack() }
    ) {
    NavHost(
        navController = navController,
        startDestination = MoveFuelRoute.AUTH_001.path,
        enterTransition = { fadeIn(tween(MoveFuelMotion.Screen)) },
        exitTransition = { fadeOut(tween(MoveFuelMotion.Small)) },
        popEnterTransition = { fadeIn(tween(MoveFuelMotion.Card)) },
        popExitTransition = { fadeOut(tween(MoveFuelMotion.Small)) },
    ) {
        composable(MoveFuelRoute.MASTER_TODAY.path) {
            TodayMasterDashboard(
                navigate,
                state = canonicalState.toTodayUiState(),
                trainState = trainState,
            )
        }
        composable(MoveFuelRoute.MASTER_FUEL.path) { FuelMasterDashboard(navigate, state = canonicalState) }
        composable(MoveFuelRoute.MASTER_TRAIN.path) {
            TrainMasterDashboard(navigate, state = canonicalState)
        }
        composable(MoveFuelRoute.MASTER_PROGRESS.path) {
            ProgressMasterDashboard(navigate, trainState = trainState, state = canonicalState)
        }
        composable(MoveFuelRoute.AUTH_001.path) { AUTH001SecureRestoreScreen(navigate) }
        composable(MoveFuelRoute.AUTH_002.path) { AUTH002SignInScreen(navigate) }
        composable(MoveFuelRoute.AUTH_003.path) { AUTH003CreateAccountScreen(navigate) }
        composable(MoveFuelRoute.AUTH_004.path) { AUTH004VerifyEmailScreen(navigate) }
        composable(MoveFuelRoute.AUTH_005.path) { AUTH005ResendVerificationScreen(navigate) }
        composable(MoveFuelRoute.AUTH_006.path) { AUTH006VerificationSuccessScreen(navigate) }
        composable(MoveFuelRoute.AUTH_007.path) { AUTH007VerificationExpiredScreen(navigate) }
        composable(MoveFuelRoute.AUTH_008.path) { AUTH008ForgotPasswordScreen(navigate) }
        composable(MoveFuelRoute.AUTH_009.path) { AUTH009ResetPasswordScreen(navigate) }
        composable(MoveFuelRoute.AUTH_010.path) { AUTH010PasswordResetSuccessScreen(navigate) }
        composable(MoveFuelRoute.AUTH_011.path) { AUTH011OfflineAccountStateScreen(navigate) }
        composable(MoveFuelRoute.AUTH_012.path) { AUTH012SessionExpiredScreen(navigate) }
        composable(MoveFuelRoute.ONB_001.path) { ONB001WelcomeScreen(navigate) }
        composable(MoveFuelRoute.ONB_002.path) { ONB002SetupChoiceScreen(navigate) }
        composable(MoveFuelRoute.ONB_003.path) {
            ONB003NameScreen(
                onNavigate = navigate,
                onNameChanged = { name -> scope.launch { CanonicalStateStore.setProfileName(context, name) } },
            )
        }
        composable(MoveFuelRoute.ONB_004.path) { ONB004DateOfBirthScreen(navigate) }
        composable(MoveFuelRoute.ONB_005.path) { ONB005CountryLanguageTimezoneScreen(navigate) }
        composable(MoveFuelRoute.ONB_006.path) { ONB006UnitsScreen(navigate) }
        composable(MoveFuelRoute.ONB_007.path) { ONB007HeightScreen(navigate) }
        composable(MoveFuelRoute.ONB_008.path) { ONB008CurrentWeightScreen(navigate) }
        composable(MoveFuelRoute.ONB_009.path) { ONB009EnergyEstimationSettingScreen(navigate) }
        composable(MoveFuelRoute.ONB_010.path) { ONB010DailyActivityScreen(navigate) }
        composable(MoveFuelRoute.ONB_011.path) { ONB011OptionalBodyCompositionScreen(navigate) }
        composable(MoveFuelRoute.ONB_012.path) { ONB012PrimaryGoalScreen(navigate) }
        composable(MoveFuelRoute.ONB_013.path) { ONB013TargetContextScreen(navigate) }
        composable(MoveFuelRoute.ONB_014.path) { ONB014TrainingFrequencyScreen(navigate) }
        composable(MoveFuelRoute.ONB_015.path) { ONB015SessionDurationScreen(navigate) }
        composable(MoveFuelRoute.ONB_016.path) { ONB016DietaryPreferencesScreen(navigate) }
        composable(MoveFuelRoute.ONB_017.path) { ONB017AllergiesAndExclusionsScreen(navigate) }
        composable(MoveFuelRoute.ONB_018.path) { ONB018TargetReviewAndFinishScreen(navigate) }
        composable(MoveFuelRoute.TOD_001.path) { TOD001TodayDashboardScreen(navigate) }
        composable(MoveFuelRoute.TOD_002.path) { TOD002NutritionExpandedScreen(navigate) }
        composable(MoveFuelRoute.TOD_003.path) { TOD003NextActionDetailScreen(navigate) }
        composable(MoveFuelRoute.TOD_004.path) { TOD004DeviceStatusScreen(navigate) }
        composable(MoveFuelRoute.TOD_005.path) {
            TOD005TodayWorkoutPreviewScreen(navigate, trainState = trainState)
        }
        composable(MoveFuelRoute.TOD_006.path) { TOD006TodayMealPlanScreen(navigate) }
        composable(MoveFuelRoute.TOD_007.path) { TOD007ConfirmedMealsScreen(navigate) }
        composable(MoveFuelRoute.TOD_008.path) { TOD008TodayLoadingScreen(navigate) }
        composable(MoveFuelRoute.TOD_009.path) { TOD009TodayEmptyScreen(navigate) }
        composable(MoveFuelRoute.TOD_010.path) { TOD010TodayUnknownScreen(navigate) }
        composable(MoveFuelRoute.TOD_011.path) { TOD011TodayOfflineScreen(navigate) }
        composable(MoveFuelRoute.TOD_012.path) { TOD012TodayStaleScreen(navigate) }
        composable(MoveFuelRoute.CAM_001.path) { CAM001FoodCameraScreen(navigate) }
        composable(MoveFuelRoute.CAM_002.path) { CAM002CameraPermissionScreen(navigate) }
        composable(MoveFuelRoute.CAM_003.path) { CAM003FoodFramingScreen(navigate) }
        composable(MoveFuelRoute.CAM_004.path) { CAM004GalleryPickerScreen(navigate) }
        composable(MoveFuelRoute.CAM_005.path) { CAM005ImagePreviewScreen(navigate) }
        composable(MoveFuelRoute.CAM_006.path) { CAM006CheckingImageScreen(navigate) }
        composable(MoveFuelRoute.CAM_007.path) { CAM007DetectingFoodsScreen(navigate) }
        composable(MoveFuelRoute.CAM_008.path) { CAM008MultiFoodDetectionScreen(navigate) }
        composable(MoveFuelRoute.CAM_009.path) { CAM009EstimatingPortionsScreen(navigate) }
        composable(MoveFuelRoute.CAM_010.path) { CAM010NutritionMatchingScreen(navigate) }
        composable(MoveFuelRoute.CAM_011.path) { CAM011DetectedFoodReviewScreen(navigate) }
        composable(MoveFuelRoute.CAM_012.path) { CAM012EditFoodIdentityScreen(navigate) }
        composable(MoveFuelRoute.CAM_013.path) { CAM013EditPortionScreen(navigate) }
        composable(MoveFuelRoute.CAM_014.path) { CAM014AddMissedFoodScreen(navigate) }
        composable(MoveFuelRoute.CAM_015.path) { CAM015LowConfidenceClarificationScreen(navigate) }
        composable(MoveFuelRoute.CAM_016.path) { CAM016NutritionUnavailableScreen(navigate) }
        composable(MoveFuelRoute.CAM_017.path) { CAM017FinalMealReviewScreen(navigate) }
        composable(MoveFuelRoute.CAM_018.path) { CAM018AnalysisFailureScreen(navigate) }
        composable(MoveFuelRoute.BAR_001.path) { BAR001BarcodeScannerScreen(navigate) }
        composable(MoveFuelRoute.BAR_002.path) { BAR002ScanningScreen(navigate) }
        composable(MoveFuelRoute.BAR_003.path) { BAR003BarcodeDetectedScreen(navigate) }
        composable(MoveFuelRoute.BAR_004.path) { BAR004ProductLookupScreen(navigate) }
        composable(MoveFuelRoute.BAR_005.path) { BAR005ProductFoundScreen(navigate) }
        composable(MoveFuelRoute.BAR_006.path) { BAR006ServingSelectorScreen(navigate) }
        composable(MoveFuelRoute.BAR_007.path) { BAR007ExpandedNutritionScreen(navigate) }
        composable(MoveFuelRoute.BAR_008.path) { BAR008IngredientsAndAllergensScreen(navigate) }
        composable(MoveFuelRoute.BAR_009.path) { BAR009AddToMealScreen(navigate) }
        composable(MoveFuelRoute.BAR_010.path) { BAR010MealSelectorScreen(navigate) }
        composable(MoveFuelRoute.BAR_011.path) { BAR011ConfirmProductScreen(navigate) }
        composable(MoveFuelRoute.BAR_012.path) { BAR012AddToShopScreen(navigate) }
        composable(MoveFuelRoute.BAR_013.path) { BAR013ProductNotFoundScreen(navigate) }
        composable(MoveFuelRoute.BAR_014.path) { BAR014NutritionLabelCameraScreen(navigate) }
        composable(MoveFuelRoute.BAR_015.path) { BAR015LabelReviewScreen(navigate) }
        composable(MoveFuelRoute.BAR_016.path) { BAR016CustomProductScreen(navigate) }
        composable(MoveFuelRoute.FNO_001.path) {
            FNO001FuelNowDashboardScreen(navigate, state = canonicalState)
        }
        composable(MoveFuelRoute.FNO_002.path) { FNO002SelectedDateScreen(navigate) }
        composable(MoveFuelRoute.FNO_003.path) { FNO003NutritionSummaryScreen(navigate) }
        composable(MoveFuelRoute.FNO_004.path) { FNO004ExpandedNutritionScreen(navigate) }
        composable(MoveFuelRoute.FNO_005.path) { FNO005MealGroupsScreen(navigate) }
        composable(MoveFuelRoute.FNO_006.path) { FNO006MealDetailScreen(navigate) }
        composable(MoveFuelRoute.FNO_007.path) { FNO007EditMealScreen(navigate) }
        composable(MoveFuelRoute.FNO_008.path) { FNO008DeleteMealConfirmationScreen(navigate) }
        composable(MoveFuelRoute.FNO_009.path) { FNO009AddFoodMenuScreen(navigate) }
        composable(MoveFuelRoute.FNO_010.path) { FNO010FoodSearchScreen(navigate) }
        composable(MoveFuelRoute.FNO_011.path) { FNO011FoodDetailScreen(navigate) }
        composable(MoveFuelRoute.FNO_012.path) { FNO012ServingSelectorScreen(navigate) }
        composable(MoveFuelRoute.FNO_013.path) { FNO013RecentFoodsScreen(navigate) }
        composable(MoveFuelRoute.FNO_014.path) { FNO014FrequentFoodsScreen(navigate) }
        composable(MoveFuelRoute.FNO_015.path) { FNO015FavoritesScreen(navigate) }
        composable(MoveFuelRoute.FNO_016.path) { FNO016SavedMealsScreen(navigate) }
        composable(MoveFuelRoute.FNO_017.path) { FNO017FuelEmptyScreen(navigate) }
        composable(MoveFuelRoute.FNO_018.path) { FNO018FuelOfflineScreen(navigate) }
        composable(MoveFuelRoute.FPL_001.path) { FPL001FuelPlanDashboardScreen(navigate) }
        composable(MoveFuelRoute.FPL_002.path) { FPL002PlanDayViewScreen(navigate) }
        composable(MoveFuelRoute.FPL_003.path) { FPL003PlanWeekViewScreen(navigate) }
        composable(MoveFuelRoute.FPL_004.path) { FPL004PlanMonthViewScreen(navigate) }
        composable(MoveFuelRoute.FPL_005.path) { FPL005PlanPreferencesScreen(navigate) }
        composable(MoveFuelRoute.FPL_006.path) { FPL006DietPreferencesScreen(navigate) }
        composable(MoveFuelRoute.FPL_007.path) { FPL007AllergyRulesScreen(navigate) }
        composable(MoveFuelRoute.FPL_008.path) { FPL008CuisinePreferencesScreen(navigate) }
        composable(MoveFuelRoute.FPL_009.path) { FPL009CookingPreferencesScreen(navigate) }
        composable(MoveFuelRoute.FPL_010.path) { FPL010BudgetPreferencesScreen(navigate) }
        composable(MoveFuelRoute.FPL_011.path) { FPL011PantryContextScreen(navigate) }
        composable(MoveFuelRoute.FPL_012.path) { FPL012TrainingContextScreen(navigate) }
        composable(MoveFuelRoute.FPL_013.path) { FPL013PlanSetupReviewScreen(navigate) }
        composable(MoveFuelRoute.FPL_014.path) { FPL014GeneratingMealPlanScreen(navigate) }
        composable(MoveFuelRoute.FPL_015.path) { FPL015WeeklyProposalScreen(navigate) }
        composable(MoveFuelRoute.FPL_016.path) { FPL016DayProposalScreen(navigate) }
        composable(MoveFuelRoute.FPL_017.path) { FPL017PlannedMealDetailScreen(navigate) }
        composable(MoveFuelRoute.FPL_018.path) { FPL018SwapMealScreen(navigate) }
        composable(MoveFuelRoute.FPL_019.path) { FPL019MealAlternativesScreen(navigate) }
        composable(MoveFuelRoute.FPL_020.path) { FPL020ServingChangeScreen(navigate) }
        composable(MoveFuelRoute.FPL_021.path) { FPL021MoveMealScreen(navigate) }
        composable(MoveFuelRoute.FPL_022.path) { FPL022PlanConflictScreen(navigate) }
        composable(MoveFuelRoute.FPL_023.path) { FPL023ConfirmPlanScreen(navigate) }
        composable(MoveFuelRoute.FPL_024.path) { FPL024PlanRevisionHistoryScreen(navigate) }
        composable(MoveFuelRoute.FSH_001.path) { FSH001ShopDashboardScreen(navigate) }
        composable(MoveFuelRoute.FSH_002.path) { FSH002ShoppingListScreen(navigate) }
        composable(MoveFuelRoute.FSH_003.path) { FSH003ShoppingItemDetailScreen(navigate) }
        composable(MoveFuelRoute.FSH_004.path) { FSH004EditShoppingItemScreen(navigate) }
        composable(MoveFuelRoute.FSH_005.path) { FSH005MarkPurchasedScreen(navigate) }
        composable(MoveFuelRoute.FSH_006.path) { FSH006UndoPurchasedScreen(navigate) }
        composable(MoveFuelRoute.FSH_007.path) { FSH007AddShoppingItemScreen(navigate) }
        composable(MoveFuelRoute.FSH_008.path) { FSH008SearchGroceryScreen(navigate) }
        composable(MoveFuelRoute.FSH_009.path) { FSH009ManualGroceryItemScreen(navigate) }
        composable(MoveFuelRoute.FSH_010.path) { FSH010ScanGroceryBarcodeScreen(navigate) }
        composable(MoveFuelRoute.FSH_011.path) { FSH011PlanRequirementsScreen(navigate) }
        composable(MoveFuelRoute.FSH_012.path) { FSH012ConsolidatedIngredientsScreen(navigate) }
        composable(MoveFuelRoute.FSH_013.path) { FSH013RecipeIngredientsScreen(navigate) }
        composable(MoveFuelRoute.FSH_014.path) { FSH014PantryScreen(navigate) }
        composable(MoveFuelRoute.FSH_015.path) { FSH015ShoppingEmptyScreen(navigate) }
        composable(MoveFuelRoute.FSH_016.path) { FSH016ShoppingOfflineScreen(navigate) }
        composable(MoveFuelRoute.RCP_001.path) { RCP001RecipesDashboardScreen(navigate) }
        composable(MoveFuelRoute.RCP_002.path) { RCP002SavedRecipesScreen(navigate) }
        composable(MoveFuelRoute.RCP_003.path) { RCP003RecipeSearchScreen(navigate) }
        composable(MoveFuelRoute.RCP_004.path) { RCP004RecipeResultsScreen(navigate) }
        composable(MoveFuelRoute.RCP_005.path) { RCP005RecipeDetailScreen(navigate) }
        composable(MoveFuelRoute.RCP_006.path) { RCP006RecipeNutritionScreen(navigate) }
        composable(MoveFuelRoute.RCP_007.path) { RCP007RecipeIngredientsScreen(navigate) }
        composable(MoveFuelRoute.RCP_008.path) { RCP008CookingModeScreen(navigate) }
        composable(MoveFuelRoute.RCP_009.path) { RCP009CookingTimerScreen(navigate) }
        composable(MoveFuelRoute.RCP_010.path) { RCP010ServingAdjustScreen(navigate) }
        composable(MoveFuelRoute.RCP_011.path) { RCP011IngredientSubstitutionScreen(navigate) }
        composable(MoveFuelRoute.RCP_012.path) { RCP012AddRecipeToPlanScreen(navigate) }
        composable(MoveFuelRoute.RCP_013.path) { RCP013AddRecipeToShopScreen(navigate) }
        composable(MoveFuelRoute.RCP_014.path) { RCP014LogRecipeAsMealScreen(navigate) }
        composable(MoveFuelRoute.RCP_015.path) { RCP015CreateRecipeScreen(navigate) }
        composable(MoveFuelRoute.RCP_016.path) { RCP016CreateRecipeMetadataScreen(navigate) }
        composable(MoveFuelRoute.RCP_017.path) { RCP017CreateRecipeIngredientsScreen(navigate) }
        composable(MoveFuelRoute.RCP_018.path) { RCP018CreateRecipeStepsScreen(navigate) }
        composable(MoveFuelRoute.RCP_019.path) { RCP019CreateRecipeReviewScreen(navigate) }
        composable(MoveFuelRoute.RCP_020.path) { RCP020ImportSourceChoiceScreen(navigate) }
        composable(MoveFuelRoute.RCP_021.path) { RCP021YouTubeImportScreen(navigate) }
        composable(MoveFuelRoute.RCP_022.path) { RCP022WebImportScreen(navigate) }
        composable(MoveFuelRoute.RCP_023.path) { RCP023TextImportScreen(navigate) }
        composable(MoveFuelRoute.RCP_024.path) { RCP024ValidateImportSourceScreen(navigate) }
        composable(MoveFuelRoute.RCP_025.path) { RCP025ImportQueuedScreen(navigate) }
        composable(MoveFuelRoute.RCP_026.path) { RCP026ReadingSourceScreen(navigate) }
        composable(MoveFuelRoute.RCP_027.path) { RCP027ExtractingRecipeEvidenceScreen(navigate) }
        composable(MoveFuelRoute.RCP_028.path) { RCP028NormalizingIngredientsScreen(navigate) }
        composable(MoveFuelRoute.RCP_029.path) { RCP029MatchingTrustedFoodsScreen(navigate) }
        composable(MoveFuelRoute.RCP_030.path) { RCP030CheckingNutritionEligibilityScreen(navigate) }
        composable(MoveFuelRoute.RCP_031.path) { RCP031ImportNeedsReviewScreen(navigate) }
        composable(MoveFuelRoute.RCP_032.path) { RCP032UnresolvedIngredientScreen(navigate) }
        composable(MoveFuelRoute.RCP_033.path) { RCP033MissingQuantityScreen(navigate) }
        composable(MoveFuelRoute.RCP_034.path) { RCP034MissingServingsScreen(navigate) }
        composable(MoveFuelRoute.RCP_035.path) { RCP035RecipeImportConfirmationScreen(navigate) }
        composable(MoveFuelRoute.RCP_036.path) { RCP036RecipeImportFailureScreen(navigate) }
        composable(MoveFuelRoute.TRS_001.path) { TRS001TrainSetupWelcomeScreen(navigate) }
        composable(MoveFuelRoute.TRS_002.path) { TRS002TrainingExperienceScreen(navigate) }
        composable(MoveFuelRoute.TRS_003.path) { TRS003ActivityExperienceScreen(navigate) }
        composable(MoveFuelRoute.TRS_004.path) { TRS004TrainingGoalScreen(navigate) }
        composable(MoveFuelRoute.TRS_005.path) { TRS005PreferredActivitiesScreen(navigate) }
        composable(MoveFuelRoute.TRS_006.path) { TRS006EnvironmentScreen(navigate) }
        composable(MoveFuelRoute.TRS_007.path) { TRS007EquipmentScreen(navigate) }
        composable(MoveFuelRoute.TRS_008.path) { TRS008WeeklyAvailabilityScreen(navigate) }
        composable(MoveFuelRoute.TRS_009.path) { TRS009PreferredDaysScreen(navigate) }
        composable(MoveFuelRoute.TRS_010.path) { TRS010PreferredTimeScreen(navigate) }
        composable(MoveFuelRoute.TRS_011.path) { TRS011SessionDurationScreen(navigate) }
        composable(MoveFuelRoute.TRS_012.path) { TRS012ExercisePreferencesScreen(navigate) }
        composable(MoveFuelRoute.TRS_013.path) { TRS013ExerciseDislikesScreen(navigate) }
        composable(MoveFuelRoute.TRS_014.path) { TRS014MovementLimitationsScreen(navigate) }
        composable(MoveFuelRoute.TRS_015.path) { TRS015LongTermRestrictionsScreen(navigate) }
        composable(MoveFuelRoute.TRS_016.path) { TRS016PainSafetyScreen(navigate) }
        composable(MoveFuelRoute.TRS_017.path) { TRS017SorenessSetupScreen(navigate) }
        composable(MoveFuelRoute.TRS_018.path) { TRS018ReadinessSetupScreen(navigate) }
        composable(MoveFuelRoute.TRS_019.path) { TRS019PerformanceBaselineScreen(navigate) }
        composable(MoveFuelRoute.TRS_020.path) {
            TRS020PlanPreviewScreen(navigate, onActivate = activateTrainPlan)
        }
        composable(MoveFuelRoute.TRN_001.path) {
            TRN001TrainNowDashboardScreen(navigate, state = canonicalState)
        }
        composable(MoveFuelRoute.TRN_002.path) { TRN002ReadinessSummaryScreen(navigate) }
        composable(MoveFuelRoute.TRN_003.path) { TRN003ReadinessDetailScreen(navigate) }
        composable(MoveFuelRoute.TRN_004.path) { TRN004WhyAdaptedScreen(navigate) }
        composable(MoveFuelRoute.TRN_005.path) { TRN005TodayWorkoutScreen(navigate) }
        composable(MoveFuelRoute.TRN_006.path) { TRN006WorkoutDetailScreen(navigate) }
        composable(MoveFuelRoute.TRN_007.path) { TRN007StartWorkoutScreen(navigate) }
        composable(MoveFuelRoute.TRN_008.path) { TRN008RescheduleWorkoutScreen(navigate) }
        composable(MoveFuelRoute.TRN_009.path) { TRN009QuickStartScreen(navigate) }
        composable(MoveFuelRoute.TRN_010.path) { TRN010WeeklyPlanScreen(navigate) }
        composable(MoveFuelRoute.TRN_011.path) { TRN011WeeklyDayDetailScreen(navigate) }
        composable(MoveFuelRoute.TRN_012.path) { TRN012LessTimeTodayScreen(navigate) }
        composable(MoveFuelRoute.TRN_013.path) { TRN013EquipmentUnavailableScreen(navigate) }
        composable(MoveFuelRoute.TRN_014.path) { TRN014ReplacementOptionsScreen(navigate) }
        composable(MoveFuelRoute.TRN_015.path) { TRN015RecoveryDayScreen(navigate) }
        composable(MoveFuelRoute.TRN_016.path) { TRN016MissedWorkoutScreen(navigate) }
        composable(MoveFuelRoute.TRN_017.path) { TRN017ProgramSettingsScreen(navigate) }
        composable(MoveFuelRoute.TRN_018.path) { TRN018ProgramRevisionHistoryScreen(navigate) }
        composable(MoveFuelRoute.TRN_019.path) { TRN019RecentWorkoutsScreen(navigate) }
        composable(MoveFuelRoute.TRN_020.path) { TRN020TrainLoadingScreen(navigate) }
        composable(MoveFuelRoute.TRN_021.path) { TRN021TrainEmptyScreen(navigate) }
        composable(MoveFuelRoute.TRN_022.path) { TRN022TrainUnknownScreen(navigate) }
        composable(MoveFuelRoute.TRN_023.path) { TRN023TrainOfflineScreen(navigate) }
        composable(MoveFuelRoute.TRN_024.path) { TRN024TrainStaleScreen(navigate) }
        composable(MoveFuelRoute.WRK_001.path) { WRK001PreWorkoutScreen(navigate) }
        composable(MoveFuelRoute.WRK_002.path) { WRK002WorkoutStartScreen(navigate) }
        composable(MoveFuelRoute.WRK_003.path) { WRK003ActiveExerciseScreen(navigate) }
        composable(MoveFuelRoute.WRK_004.path) { WRK004ExerciseMediaLoadingScreen(navigate) }
        composable(MoveFuelRoute.WRK_005.path) { WRK005ExerciseInstructionsScreen(navigate) }
        composable(MoveFuelRoute.WRK_006.path) { WRK006SetInputScreen(navigate) }
        composable(MoveFuelRoute.WRK_007.path) { WRK007RepsInputScreen(navigate) }
        composable(MoveFuelRoute.WRK_008.path) { WRK008LoadInputScreen(navigate) }
        composable(MoveFuelRoute.WRK_009.path) { WRK009TimeInputScreen(navigate) }
        composable(MoveFuelRoute.WRK_010.path) { WRK010DistanceInputScreen(navigate) }
        composable(MoveFuelRoute.WRK_011.path) { WRK011RPEInputScreen(navigate) }
        composable(MoveFuelRoute.WRK_012.path) { WRK012ReviewSetScreen(navigate) }
        composable(MoveFuelRoute.WRK_013.path) { WRK013CompleteSetScreen(navigate) }
        composable(MoveFuelRoute.WRK_014.path) { WRK014RestTimerScreen(navigate) }
        composable(MoveFuelRoute.WRK_015.path) { WRK015ExtendRestScreen(navigate) }
        composable(MoveFuelRoute.WRK_016.path) { WRK016SkipRestScreen(navigate) }
        composable(MoveFuelRoute.WRK_017.path) { WRK017NextSetScreen(navigate) }
        composable(MoveFuelRoute.WRK_018.path) { WRK018ExerciseCompleteScreen(navigate) }
        composable(MoveFuelRoute.WRK_019.path) { WRK019NextExerciseScreen(navigate) }
        composable(MoveFuelRoute.WRK_020.path) { WRK020SubstituteExerciseScreen(navigate) }
        composable(MoveFuelRoute.WRK_021.path) { WRK021SubstitutionCandidatesScreen(navigate) }
        composable(MoveFuelRoute.WRK_022.path) { WRK022SubstitutionDetailScreen(navigate) }
        composable(MoveFuelRoute.WRK_023.path) { WRK023ConfirmSubstituteScreen(navigate) }
        composable(MoveFuelRoute.WRK_024.path) { WRK024SkipSetScreen(navigate) }
        composable(MoveFuelRoute.WRK_025.path) { WRK025SkipExerciseScreen(navigate) }
        composable(MoveFuelRoute.WRK_026.path) { WRK026WorkoutNoteScreen(navigate) }
        composable(MoveFuelRoute.WRK_027.path) { WRK027PauseWorkoutScreen(navigate) }
        composable(MoveFuelRoute.WRK_028.path) { WRK028ResumeWorkoutScreen(navigate) }
        composable(MoveFuelRoute.WRK_029.path) { WRK029PainSafetyPauseScreen(navigate) }
        composable(MoveFuelRoute.WRK_030.path) { WRK030FinishEarlyConfirmationScreen(navigate) }
        composable(MoveFuelRoute.WRK_031.path) { WRK031PostWorkoutCheckInScreen(navigate) }
        composable(MoveFuelRoute.WRK_032.path) {
            WRK032WorkoutSummaryScreen(navigate, state = canonicalState)
        }
        composable(MoveFuelRoute.SOR_001.path) { SOR001SorenessDashboardScreen(navigate) }
        composable(MoveFuelRoute.SOR_002.path) { SOR002FrontBodyMapScreen(navigate) }
        composable(MoveFuelRoute.SOR_003.path) { SOR003BackBodyMapScreen(navigate) }
        composable(MoveFuelRoute.SOR_004.path) { SOR004SelectRegionScreen(navigate) }
        composable(MoveFuelRoute.SOR_005.path) { SOR005SorenessSeverityScreen(navigate) }
        composable(MoveFuelRoute.SOR_006.path) { SOR006MultipleRegionReviewScreen(navigate) }
        composable(MoveFuelRoute.SOR_007.path) { SOR007SaveSorenessScreen(navigate) }
        composable(MoveFuelRoute.SOR_008.path) { SOR008CurrentSorenessSummaryScreen(navigate) }
        composable(MoveFuelRoute.SOR_009.path) { SOR009SorenessHistoryScreen(navigate) }
        composable(MoveFuelRoute.SOR_010.path) { SOR010PainSafetyRouteScreen(navigate) }
        composable(MoveFuelRoute.RDY_001.path) { RDY001ReadinessCheckInScreen(navigate) }
        composable(MoveFuelRoute.RDY_002.path) { RDY002EnergyCheckScreen(navigate) }
        composable(MoveFuelRoute.RDY_003.path) { RDY003FatigueCheckScreen(navigate) }
        composable(MoveFuelRoute.RDY_004.path) { RDY004RecoverySleepCheckScreen(navigate) }
        composable(MoveFuelRoute.RDY_005.path) { RDY005SorenessCheckScreen(navigate) }
        composable(MoveFuelRoute.RDY_006.path) { RDY006EvaluatingReadinessScreen(navigate) }
        composable(MoveFuelRoute.RDY_007.path) { RDY007ReadinessFullScreen(navigate) }
        composable(MoveFuelRoute.RDY_008.path) { RDY008ReadinessReducedScreen(navigate) }
        composable(MoveFuelRoute.RDY_009.path) { RDY009ReadinessRecoveryScreen(navigate) }
        composable(MoveFuelRoute.RDY_010.path) { RDY010ReadinessStopScreen(navigate) }
        composable(MoveFuelRoute.EXR_001.path) { EXR001ExerciseLibraryScreen(navigate) }
        composable(MoveFuelRoute.EXR_002.path) { EXR002ExerciseSearchScreen(navigate) }
        composable(MoveFuelRoute.EXR_003.path) { EXR003ExerciseFiltersScreen(navigate) }
        composable(MoveFuelRoute.EXR_004.path) { EXR004FilterEquipmentScreen(navigate) }
        composable(MoveFuelRoute.EXR_005.path) { EXR005FilterMovementScreen(navigate) }
        composable(MoveFuelRoute.EXR_006.path) { EXR006FilterMuscleScreen(navigate) }
        composable(MoveFuelRoute.EXR_007.path) { EXR007FilterEnvironmentScreen(navigate) }
        composable(MoveFuelRoute.EXR_008.path) { EXR008FilterDifficultyScreen(navigate) }
        composable(MoveFuelRoute.EXR_009.path) { EXR009ExerciseResultsScreen(navigate) }
        composable(MoveFuelRoute.EXR_010.path) { EXR010ExerciseDetailScreen(navigate) }
        composable(MoveFuelRoute.EXR_011.path) { EXR011ExerciseMediaScreen(navigate) }
        composable(MoveFuelRoute.EXR_012.path) { EXR012ExerciseSetupScreen(navigate) }
        composable(MoveFuelRoute.EXR_013.path) { EXR013ExerciseExecutionScreen(navigate) }
        composable(MoveFuelRoute.EXR_014.path) { EXR014TechniqueCuesScreen(navigate) }
        composable(MoveFuelRoute.EXR_015.path) { EXR015CommonMistakesScreen(navigate) }
        composable(MoveFuelRoute.EXR_016.path) { EXR016ExerciseSubstitutionsScreen(navigate) }
        composable(MoveFuelRoute.CAL_001.path) { CAL001CalendarDashboardScreen(navigate) }
        composable(MoveFuelRoute.CAL_002.path) { CAL002MonthViewScreen(navigate) }
        composable(MoveFuelRoute.CAL_003.path) { CAL003WeekViewScreen(navigate) }
        composable(MoveFuelRoute.CAL_004.path) { CAL004DayViewScreen(navigate) }
        composable(MoveFuelRoute.CAL_005.path) { CAL005SelectedDateScreen(navigate) }
        composable(MoveFuelRoute.CAL_006.path) { CAL006WorkoutEventScreen(navigate) }
        composable(MoveFuelRoute.CAL_007.path) { CAL007MealEventScreen(navigate) }
        composable(MoveFuelRoute.CAL_008.path) { CAL008RecoveryEventScreen(navigate) }
        composable(MoveFuelRoute.CAL_009.path) { CAL009RescheduleEventScreen(navigate) }
        composable(MoveFuelRoute.CAL_010.path) { CAL010ChooseDateScreen(navigate) }
        composable(MoveFuelRoute.CAL_011.path) { CAL011ChooseTimeScreen(navigate) }
        composable(MoveFuelRoute.CAL_012.path) { CAL012CalendarConflictScreen(navigate) }
        composable(MoveFuelRoute.CAL_013.path) { CAL013ConflictExplanationScreen(navigate) }
        composable(MoveFuelRoute.CAL_014.path) { CAL014SuggestedAlternativesScreen(navigate) }
        composable(MoveFuelRoute.CAL_015.path) { CAL015ConfirmRescheduleScreen(navigate) }
        composable(MoveFuelRoute.CAL_016.path) { CAL016MissedWorkoutScreen(navigate) }
        composable(MoveFuelRoute.CAL_017.path) { CAL017MissedMealScreen(navigate) }
        composable(MoveFuelRoute.CAL_018.path) { CAL018CalendarOfflineScreen(navigate) }
        composable(MoveFuelRoute.PRG_001.path) { PRG001ProgressDashboardScreen(navigate) }
        composable(MoveFuelRoute.PRG_002.path) { PRG002MetricSelectorScreen(navigate) }
        composable(MoveFuelRoute.PRG_003.path) { PRG003Range7DaysScreen(navigate) }
        composable(MoveFuelRoute.PRG_004.path) { PRG004Range30DaysScreen(navigate) }
        composable(MoveFuelRoute.PRG_005.path) { PRG005Range3MonthsScreen(navigate) }
        composable(MoveFuelRoute.PRG_006.path) { PRG006Range6MonthsScreen(navigate) }
        composable(MoveFuelRoute.PRG_007.path) { PRG007Range1YearScreen(navigate) }
        composable(MoveFuelRoute.PRG_008.path) { PRG008RangeAllScreen(navigate) }
        composable(MoveFuelRoute.PRG_009.path) { PRG009ExpandedGraphScreen(navigate) }
        composable(MoveFuelRoute.PRG_010.path) { PRG010ExactDataPointScreen(navigate) }
        composable(MoveFuelRoute.PRG_011.path) { PRG011MissingDataPeriodScreen(navigate) }
        composable(MoveFuelRoute.PRG_012.path) { PRG012DataCoverageScreen(navigate) }
        composable(MoveFuelRoute.PRG_013.path) { PRG013GoalProgressScreen(navigate) }
        composable(MoveFuelRoute.PRG_014.path) { PRG014TargetRevisionMarkerScreen(navigate) }
        composable(MoveFuelRoute.PRG_015.path) { PRG015MilestoneDetailScreen(navigate) }
        composable(MoveFuelRoute.PRG_016.path) { PRG016PersonalRecordsScreen(navigate) }
        composable(MoveFuelRoute.PRG_017.path) {
            PRG017TrainingProgressScreen(navigate, trainState = trainState)
        }
        composable(MoveFuelRoute.PRG_018.path) {
            PRG018StrengthProgressScreen(navigate, trainState = trainState)
        }
        composable(MoveFuelRoute.PRG_019.path) {
            PRG019TrainingVolumeScreen(navigate, trainState = trainState)
        }
        composable(MoveFuelRoute.PRG_020.path) {
            PRG020WorkoutConsistencyScreen(navigate, trainState = trainState)
        }
        composable(MoveFuelRoute.PRG_021.path) {
            PRG021WorkoutDurationScreen(navigate, trainState = trainState)
        }
        composable(MoveFuelRoute.PRG_022.path) { PRG022NutritionProgressScreen(navigate) }
        composable(MoveFuelRoute.PRG_023.path) { PRG023NutritionAveragesScreen(navigate) }
        composable(MoveFuelRoute.PRG_024.path) { PRG024ProteinTrendScreen(navigate) }
        composable(MoveFuelRoute.PRG_025.path) { PRG025FiberTrendScreen(navigate) }
        composable(MoveFuelRoute.PRG_026.path) { PRG026ActivityProgressScreen(navigate) }
        composable(MoveFuelRoute.PRG_027.path) { PRG027RunningProgressScreen(navigate) }
        composable(MoveFuelRoute.PRG_028.path) { PRG028SwimmingProgressScreen(navigate) }
        composable(MoveFuelRoute.PRG_029.path) { PRG029WeeklyReportScreen(navigate) }
        composable(MoveFuelRoute.PRG_030.path) { PRG030MonthlyReportScreen(navigate) }
        composable(MoveFuelRoute.PRO_001.path) { PRO001ProfileDashboardScreen(navigate) }
        composable(MoveFuelRoute.PRO_002.path) { PRO002PersonalDetailsScreen(navigate) }
        composable(MoveFuelRoute.PRO_003.path) { PRO003TargetsAndGoalsScreen(navigate) }
        composable(MoveFuelRoute.PRO_004.path) { PRO004EditTargetScreen(navigate) }
        composable(MoveFuelRoute.PRO_005.path) { PRO005TargetPreviewScreen(navigate) }
        composable(MoveFuelRoute.PRO_006.path) { PRO006TargetRevisionHistoryScreen(navigate) }
        composable(MoveFuelRoute.PRO_007.path) { PRO007UnitsScreen(navigate) }
        composable(MoveFuelRoute.PRO_008.path) { PRO008LanguageAndRegionScreen(navigate) }
        composable(MoveFuelRoute.PRO_009.path) { PRO009AppearanceScreen(navigate) }
        composable(MoveFuelRoute.PRO_010.path) { PRO010SoundAndHapticsScreen(navigate) }
        composable(MoveFuelRoute.PRO_011.path) { PRO011NotificationsScreen(navigate) }
        composable(MoveFuelRoute.PRO_012.path) { PRO012PrivacyAndDataScreen(navigate) }
        composable(MoveFuelRoute.PRO_013.path) { PRO013ExportDataScreen(navigate) }
        composable(MoveFuelRoute.PRO_014.path) { PRO014DeleteAccountScreen(navigate) }
        composable(MoveFuelRoute.PRO_015.path) { PRO015TermsAndPrivacyScreen(navigate) }
        composable(MoveFuelRoute.PRO_016.path) { PRO016HelpCenterScreen(navigate) }
        composable(MoveFuelRoute.PRO_017.path) { PRO017FinishPersonalizationScreen(navigate) }
        composable(MoveFuelRoute.PRO_018.path) { PRO018ProfileOfflineScreen(navigate) }
        composable(MoveFuelRoute.DEV_001.path) { DEV001DevicesDashboardScreen(navigate) }
        composable(MoveFuelRoute.DEV_002.path) { DEV002ConnectWearOSScreen(navigate) }
        composable(MoveFuelRoute.DEV_003.path) { DEV003DeviceDiscoveryScreen(navigate) }
        composable(MoveFuelRoute.DEV_004.path) { DEV004DeviceFoundScreen(navigate) }
        composable(MoveFuelRoute.DEV_005.path) { DEV005PairingScreen(navigate) }
        composable(MoveFuelRoute.DEV_006.path) { DEV006ConnectedDeviceScreen(navigate) }
        composable(MoveFuelRoute.DEV_007.path) { DEV007DeviceDetailScreen(navigate) }
        composable(MoveFuelRoute.DEV_008.path) { DEV008DevicePermissionsScreen(navigate) }
        composable(MoveFuelRoute.DEV_009.path) { DEV009ManualSyncScreen(navigate) }
        composable(MoveFuelRoute.DEV_010.path) { DEV010StaleDeviceScreen(navigate) }
        composable(MoveFuelRoute.DEV_011.path) { DEV011ReconnectDeviceScreen(navigate) }
        composable(MoveFuelRoute.DEV_012.path) { DEV012DisconnectDeviceScreen(navigate) }
        composable(MoveFuelRoute.BIL_001.path) { BIL001BillingDashboardScreen(navigate) }
        composable(MoveFuelRoute.BIL_002.path) { BIL002CurrentPlanScreen(navigate) }
        composable(MoveFuelRoute.BIL_003.path) { BIL003ComparePlansScreen(navigate) }
        composable(MoveFuelRoute.BIL_004.path) { BIL004PlanDetailScreen(navigate) }
        composable(MoveFuelRoute.BIL_005.path) { BIL005PurchaseConfirmationScreen(navigate) }
        composable(MoveFuelRoute.BIL_006.path) { BIL006PurchaseProcessingScreen(navigate) }
        composable(MoveFuelRoute.BIL_007.path) { BIL007PurchaseResultScreen(navigate) }
        composable(MoveFuelRoute.BIL_008.path) { BIL008RestorePurchaseScreen(navigate) }
        composable(MoveFuelRoute.WAR_001.path) { WAR001WearTodayScreen(navigate) }
        composable(MoveFuelRoute.WAR_002.path) { WAR002WearReadinessScreen(navigate) }
        composable(MoveFuelRoute.WAR_003.path) { WAR003WearWorkoutPreviewScreen(navigate) }
        composable(MoveFuelRoute.WAR_004.path) { WAR004WearActiveExerciseScreen(navigate) }
        composable(MoveFuelRoute.WAR_005.path) { WAR005WearSetInputScreen(navigate) }
        composable(MoveFuelRoute.WAR_006.path) { WAR006WearCompleteSetScreen(navigate) }
        composable(MoveFuelRoute.WAR_007.path) { WAR007WearRestTimerScreen(navigate) }
        composable(MoveFuelRoute.WAR_008.path) { WAR008WearSubstituteScreen(navigate) }
        composable(MoveFuelRoute.WAR_009.path) { WAR009WearPauseScreen(navigate) }
        composable(MoveFuelRoute.WAR_010.path) { WAR010WearFinishScreen(navigate) }
        composable(MoveFuelRoute.WAR_011.path) { WAR011WearSummaryScreen(navigate) }
        composable(MoveFuelRoute.WAR_012.path) { WAR012WearSyncPendingScreen(navigate) }
        composable(MoveFuelRoute.SYS_001.path) { SYS001SystemLoadingScreen(navigate) }
        composable(MoveFuelRoute.SYS_002.path) { SYS002SystemEmptyScreen(navigate) }
        composable(MoveFuelRoute.SYS_003.path) { SYS003SystemUnknownScreen(navigate) }
        composable(MoveFuelRoute.SYS_004.path) { SYS004SystemPartialDataScreen(navigate) }
        composable(MoveFuelRoute.SYS_005.path) { SYS005SystemOfflineScreen(navigate) }
        composable(MoveFuelRoute.SYS_006.path) { SYS006SystemSavedOfflineScreen(navigate) }
        composable(MoveFuelRoute.SYS_007.path) { SYS007SystemStaleScreen(navigate) }
        composable(MoveFuelRoute.SYS_008.path) { SYS008RetryableErrorScreen(navigate) }
        composable(MoveFuelRoute.SYS_009.path) { SYS009UnavailableStateScreen(navigate) }
        composable(MoveFuelRoute.SYS_010.path) { SYS010PermissionRequiredScreen(navigate) }
        composable(MoveFuelRoute.SYS_011.path) { SYS011PermissionDeniedScreen(navigate) }
        composable(MoveFuelRoute.SYS_012.path) { SYS012UnsavedChangesScreen(navigate) }
        composable(MoveFuelRoute.SYS_013.path) { SYS013DestructiveConfirmationScreen(navigate) }
        composable(MoveFuelRoute.SYS_014.path) { SYS014SuccessStateScreen(navigate) }
        composable(MoveFuelRoute.SYS_015.path) { SYS015SyncingScreen(navigate) }
        composable(MoveFuelRoute.SYS_016.path) { SYS016SyncPendingScreen(navigate) }
        composable(MoveFuelRoute.SYS_017.path) { SYS017SyncFailedScreen(navigate) }
        composable(MoveFuelRoute.SYS_018.path) { SYS018ConflictReviewScreen(navigate) }
        composable(MoveFuelRoute.SYS_019.path) { SYS019InterruptedFlowScreen(navigate) }
        composable(MoveFuelRoute.SYS_020.path) { SYS020RestoredFlowScreen(navigate) }
    }
    }
}
