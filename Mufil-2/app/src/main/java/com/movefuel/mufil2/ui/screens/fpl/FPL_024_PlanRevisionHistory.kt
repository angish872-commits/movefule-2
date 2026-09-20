package com.movefuel.mufil2.ui.screens.fpl

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun FPL024PlanRevisionHistoryScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "FPL_024",
        title = "Plan Revision History",
        subtitle = "Future meal planning kept separate from consumed food.",
        primaryLabel = "Continue",
        primaryRoute = MoveFuelRoute.FSH_001,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.FPL_023,
        onNavigate = onNavigate,
    ) {
            MFListItem("Revision 3","Current plan","Active")
            MFListItem("Revision 2","Previous week","View")
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun FPL024PlanRevisionHistoryScreenPreview() {
    MoveFuelTheme { FPL024PlanRevisionHistoryScreen {} }
}
