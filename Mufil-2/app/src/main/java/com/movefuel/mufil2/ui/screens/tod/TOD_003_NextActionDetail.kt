package com.movefuel.mufil2.ui.screens.tod

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun TOD003NextActionDetailScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "TOD_003",
        title = "Next Action",
        subtitle = "Why this task is currently the most useful unfinished action.",
        primaryLabel = "Review planned lunch",
        primaryRoute = MoveFuelRoute.FPL_017,
        secondaryLabel = "Back to Today",
        secondaryRoute = MoveFuelRoute.MASTER_TODAY,
        onNavigate = onNavigate,
    ) {
        MFStatusBanner(
            "Priority",
            "Lunch is planned but has not been confirmed as consumed.",
        )
        MFListItem(
            "Planned lunch",
            "Chicken rice bowl · planned · not counted as actual",
            onClick = { onNavigate(MoveFuelRoute.FPL_017) },
        )
        MFNotice(
            "Why this appears",
            "Next Action points to unfinished work. Completing the task returns updated state to Today.",
        )
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0B1420, widthDp = 390, heightDp = 844)
@Composable
private fun TOD003NextActionDetailScreenPreview() {
    MoveFuelTheme { TOD003NextActionDetailScreen {} }
}
