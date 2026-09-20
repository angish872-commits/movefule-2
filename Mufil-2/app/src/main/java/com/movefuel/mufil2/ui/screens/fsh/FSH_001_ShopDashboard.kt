package com.movefuel.mufil2.ui.screens.fsh

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun FSH001ShopDashboardScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "FSH_001",
        title = "Shop Dashboard",
        subtitle = "Shopping and pantry workflow.",
        primaryLabel = "Continue",
        primaryRoute = MoveFuelRoute.FSH_002,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.FPL_024,
        onNavigate = onNavigate,
    ) {
            MFMetricRow("Items" to "18","Purchased" to "7","Remaining" to "11")
            MFListItem("Chicken breast","Plan requirement","2 packs")
            MFListItem("Greek yogurt","Breakfasts","1 tub")
            MFListItem("Spinach","Recipes","2 bags")
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun FSH001ShopDashboardScreenPreview() {
    MoveFuelTheme { FSH001ShopDashboardScreen {} }
}
