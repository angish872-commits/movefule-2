package com.movefuel.mufil2.ui.master

import androidx.compose.foundation.layout.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.tooling.preview.Preview
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.*
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun FuelMasterDashboard(onNavigate: (MoveFuelRoute) -> Unit) {
    MFMasterScaffold(
        active = "Fuel",
        title = "Fuel",
        subtitle = "Confirmed intake · Today",
        tabs = listOf("Now", "Plan", "Shop", "Recipes"),
        selectedTab = "Now",
        onTabSelected = { tab ->
            when (tab) {
                "Now" -> onNavigate(MoveFuelRoute.FNO_001)
                "Plan" -> onNavigate(MoveFuelRoute.FPL_001)
                "Shop" -> onNavigate(MoveFuelRoute.FSH_001)
                "Recipes" -> onNavigate(MoveFuelRoute.RCP_001)
            }
        },
        onNavigate = onNavigate,
    ) {
        MFCard(Modifier.fillMaxWidth()) {
            MFSectionHeading(
                title = "Nutrition",
                action = "Details ›",
                onAction = { onNavigate(MoveFuelRoute.FNO_004) },
            )
            Spacer(Modifier.height(MoveFuelSpacing.Base))
            Column(verticalArrangement = Arrangement.spacedBy(MoveFuelSpacing.Base)) {
                MFDailyMetricBar("Energy", "1,742 kcal", "2,180 kcal", .80f)
                MFDailyMetricBar("Protein", "116 g", "145 g", .80f)
                MFDailyMetricBar("Carbs", "186 g", "245 g", .76f)
                MFDailyMetricBar("Fat", "58 g", "72 g", .81f)
                MFDailyMetricBar("Fiber", "24 g", "30 g", .80f)
            }
        }

        MFSectionHeading(
            title = "Confirmed meals",
            action = "See all",
            onAction = { onNavigate(MoveFuelRoute.FNO_005) },
        )
        MFMealCard(
            "Breakfast",
            "Oats · yogurt · banana · confirmed",
            "480 kcal",
            MoveFuelColors.FuelAccent,
            onClick = { onNavigate(MoveFuelRoute.FNO_006) },
        )
        MFMealCard(
            "Lunch",
            "Chicken rice bowl · confirmed",
            "675 kcal",
            MoveFuelColors.SageStrong,
            onClick = { onNavigate(MoveFuelRoute.FNO_006) },
        )

        MFNotice(
            title = "Planned next meal",
            body = "Dinner is planned but is not counted as consumed food.",
            action = "Review plan",
            onAction = { onNavigate(MoveFuelRoute.FPL_017) },
        )

        MFPrimaryButton("Add food") { onNavigate(MoveFuelRoute.FNO_009) }

        MFSectionHeading("Quick add")
        MFOptionCard(
            title = "Camera",
            supporting = "Photo → review → explicit confirmation",
            onClick = { onNavigate(MoveFuelRoute.CAM_001) },
        )
        MFOptionCard(
            title = "Barcode",
            supporting = "Scan packaged food",
            onClick = { onNavigate(MoveFuelRoute.BAR_001) },
        )
        MFOptionCard(
            title = "Search",
            supporting = "Search foods and choose a serving",
            onClick = { onNavigate(MoveFuelRoute.FNO_010) },
        )
        MFOptionCard(
            title = "Recent & saved",
            supporting = "Reuse confirmed foods and meals",
            onClick = { onNavigate(MoveFuelRoute.FNO_013) },
        )
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0B1420, widthDp = 390, heightDp = 844)
@Composable
private fun FuelMasterPreview() = MoveFuelTheme { FuelMasterDashboard {} }
