package com.movefuel.mufil2.ui.screens.fpl

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun FPL013PlanSetupReviewScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "FPL_013",
        title = "Plan Setup Review",
        subtitle = "Future meal planning kept separate from consumed food.",
        primaryLabel = "Continue",
        primaryRoute = MoveFuelRoute.FPL_014,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.FPL_012,
        onNavigate = onNavigate,
    ) {
            MFListItem("Goal context","General fitness","Ready")
            MFListItem("Diet preferences","Configured","Ready")
            MFListItem("Allergy rules","Configured","Ready")
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun FPL013PlanSetupReviewScreenPreview() {
    MoveFuelTheme { FPL013PlanSetupReviewScreen {} }
}
