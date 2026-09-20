package com.movefuel.mufil2.ui.screens.fpl

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun FPL022PlanConflictScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "FPL_022",
        title = "Plan Conflict",
        subtitle = "Future meal planning kept separate from consumed food.",
        primaryLabel = "Continue",
        primaryRoute = MoveFuelRoute.FPL_023,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.FPL_021,
        onNavigate = onNavigate,
    ) {
            MFNotice("Schedule conflict","This meal overlaps another planned event. Pick an alternative time.", "See alternatives")
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun FPL022PlanConflictScreenPreview() {
    MoveFuelTheme { FPL022PlanConflictScreen {} }
}
