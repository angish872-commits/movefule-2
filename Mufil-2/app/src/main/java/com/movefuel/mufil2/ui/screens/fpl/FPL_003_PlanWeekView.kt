package com.movefuel.mufil2.ui.screens.fpl

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun FPL003PlanWeekViewScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "FPL_003",
        title = "Plan Week View",
        subtitle = "Future meal planning kept separate from consumed food.",
        primaryLabel = "Continue",
        primaryRoute = MoveFuelRoute.FPL_004,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.FPL_002,
        onNavigate = onNavigate,
    ) {
            MFCalendarMini()
            MFListItem("Lunch","Chicken rice bowl · planned","13:00")
            MFListItem("Dinner","Salmon bowl · planned","19:30")
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun FPL003PlanWeekViewScreenPreview() {
    MoveFuelTheme { FPL003PlanWeekViewScreen {} }
}
