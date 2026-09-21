package com.movefuel.mufil2.ui.screens.fno

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun FNO010FoodSearchScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "FNO_010",
        title = "Food Search",
        subtitle = "Search trusted foods, then review the food and serving before confirmation.",
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.FNO_009,
        onNavigate = onNavigate,
    ) {
        MFField("Search foods", "")
        MFSectionTitle("Results", "Tap a result to review food details.")
        MFListItem(
            "Search result",
            "Trusted reference data unavailable until the food source responds",
            onClick = { onNavigate(MoveFuelRoute.FNO_011) },
        )
        MFListItem(
            "Another search result",
            "Nutrition facts remain unknown until selected and reviewed",
            onClick = { onNavigate(MoveFuelRoute.FNO_011) },
        )
        MFListItem(
            "Create a custom food",
            "Use this when the correct food is not available",
            onClick = { onNavigate(MoveFuelRoute.BAR_016) },
        )
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0B1420, widthDp = 390, heightDp = 844)
@Composable
private fun FNO010FoodSearchScreenPreview() {
    MoveFuelTheme { FNO010FoodSearchScreen {} }
}
