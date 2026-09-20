package com.movefuel.mufil2.ui.screens.bil

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun BIL004PlanDetailScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "BIL_004",
        title = "Plan Detail",
        subtitle = "Subscription and purchase states.",
        primaryLabel = "Continue",
        primaryRoute = MoveFuelRoute.BIL_005,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.BIL_003,
        onNavigate = onNavigate,
    ) {
            MFListItem("Training","Included","✓")
            MFListItem("Nutrition","Included","✓")
            MFListItem("Advanced imports","Plan dependent","Review")
            MFListItem("Devices","Plan dependent","Review")
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun BIL004PlanDetailScreenPreview() {
    MoveFuelTheme { BIL004PlanDetailScreen {} }
}
